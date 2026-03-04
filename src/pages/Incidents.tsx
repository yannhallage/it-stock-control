import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useIncidents } from '../api/hooks/useIncidents'
import { formatDate } from '../lib/format'
import type { Asset, Incident } from '../types'
import { Button, Card, Input, PageTitle, Select, Table, Textarea } from '../components/Ui'

export function IncidentsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [items, setItems] = useState<Incident[]>([])
  const [error, setError] = useState<string | null>(null)

  const [assetId, setAssetId] = useState<number | ''>('')
  const [department, setDepartment] = useState('')
  const [reportedAt, setReportedAt] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')

  const { fetchAssets, loading: assetsLoading } = useAssets()
  const { fetchIncidents, createIncidentForAsset, loading: incidentsLoading, error: apiError } = useIncidents()

  const loading = assetsLoading || incidentsLoading

  const assetsById = useMemo(() => {
    const m = new Map<number, Asset>()
    for (const a of assets) m.set(a.id, a)
    return m
  }, [assets])

  function load() {
    setError(null)
    Promise.all([fetchAssets(), fetchIncidents({ status: 'OUVERT' })])
      .then(([a, i]) => {
        setAssets(a ?? [])
        setItems(i ?? [])
      })
      .catch((e) => {
        const msg = String(e?.message ?? e)
        setError(msg)
        toast.error(msg || 'Erreur lors du chargement.')
      })
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createIncident(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!assetId) {
      toast.warning('Veuillez sélectionner un matériel.')
      return
    }
    try {
      await createIncidentForAsset(Number(assetId), { department, reportedAt, description })
      toast.success('Panne enregistrée avec succès.')
      setAssetId('')
      setDepartment('')
      setReportedAt(new Date().toISOString().slice(0, 10))
      setDescription('')
      load()
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err)
      setError(msg)
      toast.error(msg || "Erreur lors de l'enregistrement de la panne.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle>Gestion des Pannes</PageTitle>
        <Button onClick={load} className="cursor-pointer flex items-center gap-2" disabled={loading}>
          Actualiser
        </Button>
      </div>

      {error ?? apiError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? apiError}
        </div>
      ) : null}

      <Card title="Signaler un problème">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={createIncident}>
          <Select
            label="Matériel"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Sélectionner…</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.inventoryNumber} — {a.type} — {a.brand} {a.model}
              </option>
            ))}
          </Select>
          <Input
            label="Direction concernée"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
          <Input
            label="Date de signalement"
            type="date"
            value={reportedAt}
            onChange={(e) => setReportedAt(e.target.value)}
          />
          <div />
          <div className="md:col-span-2">
            <Textarea
              label="Description du problème"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" className="cursor-pointer flex items-center gap-2" variant="primary" disabled={loading}>
              Enregistrer la panne
            </Button>
          </div>
        </form>
        <div className="mt-3 text-xs text-slate-600">
          Lorsqu'une panne est signalée, l'état du matériel passe automatiquement à <b>En Panne</b>.
        </div>
      </Card>

      <Card title="Pannes en cours (incidents ouverts)">
        <Table columns={['Inventaire', 'Matériel', 'Direction', 'Signalé le', 'Description']}>
          {items.map((it) => {
            const a = assetsById.get(it.assetId)
            return (
              <tr key={it.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {a?.inventoryNumber ?? `#${it.assetId}`}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {a ? `${a.type} — ${a.brand} ${a.model}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{it.department}</td>
                <td className="px-4 py-3 text-gray-600">
                  {formatDate(it.reportedAt)}
                </td>
                <td className="px-4 py-3 text-gray-600">{it.description}</td>
              </tr>
            )
          })}
          {!items.length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                {loading ? 'Chargement…' : 'Aucune panne en cours.'}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}
