import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useIncidents } from '../api/hooks/useIncidents'
import { useWorkshop } from '../api/hooks/useWorkshop'
import type { RepairWithRelations } from '../api/services/workshop.service'
import { formatDate } from '../lib/format'
import type { Asset, Incident } from '../types'
import { StatusBadge } from '../components/Badge'
import { Button, Card, Input, PageTitle, Select, Table, Textarea } from '../components/Ui'

export function WorkshopPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [repairs, setRepairs] = useState<RepairWithRelations[]>([])
  const [error, setError] = useState<string | null>(null)

  const [incidentId, setIncidentId] = useState<number | ''>('')
  const [action, setAction] = useState('')
  const [cost, setCost] = useState('0')
  const [workshopIn, setWorkshopIn] = useState(new Date().toISOString().slice(0, 10))

  const { fetchAssets, loading: assetsLoading } = useAssets()
  const { fetchIncidents, loading: incidentsLoading } = useIncidents()
  const { fetchRepairs, startRepair, closeRepair, loading: workshopLoading, error: apiError } = useWorkshop()

  const loading = assetsLoading || incidentsLoading || workshopLoading

  const assetsById = useMemo(() => {
    const m = new Map<number, Asset>()
    for (const a of assets) m.set(a.id, a)
    return m
  }, [assets])

  const incidentChoices = useMemo(
    () => incidents.filter((i) => i.status === 'OUVERT'),
    [incidents],
  )

  function load() {
    setError(null)
    Promise.all([
      fetchAssets(),
      fetchIncidents({ status: 'OUVERT' }),
      fetchRepairs({ status: 'EN_COURS' }),
    ])
      .then(([a, i, r]) => {
        setAssets(a ?? [])
        setIncidents(i ?? [])
        setRepairs(r ?? [])
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

  async function handleStartRepair(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!incidentId) {
      toast.warning('Veuillez sélectionner un incident.')
      return
    }
    try {
      await startRepair({
        incidentId: Number(incidentId),
        workshopEntryDate: workshopIn,
        action: action.trim() || undefined,
        cost: cost ? Number(cost) : undefined,
      })
      toast.success('Réparation démarrée.')
      setIncidentId('')
      setAction('')
      setCost('0')
      setWorkshopIn(new Date().toISOString().slice(0, 10))
      load()
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err)
      setError(msg)
      toast.error(msg || 'Erreur lors du démarrage de la réparation.')
    }
  }

  async function handleCloseRepair(repairId: number, outcome: 'EN_SERVICE' | 'HORS_SERVICE') {
    setError(null)
    try {
      await closeRepair(repairId, { outcome })
      toast.success(outcome === 'EN_SERVICE' ? 'Matériel remis en service.' : 'Matériel marqué hors service.')
      load()
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err)
      setError(msg)
      toast.error(msg || 'Erreur lors de la clôture de la réparation.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle>Suivi Atelier</PageTitle>
        <Button onClick={load} disabled={loading} className="flex items-center gap-2 cursor-pointer">
          Actualiser
        </Button>
      </div>

      {error ?? apiError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? apiError}
        </div>
      ) : null}

      <Card title="Démarrer une réparation (En Panne → En Réparation)">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleStartRepair}>
          <Select
            label="Incident"
            value={incidentId}
            onChange={(e) => setIncidentId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Sélectionner…</option>
            {incidentChoices.map((i) => (
              <option key={i.id} value={i.id}>
                #{i.id} — {assetsById.get(i.assetId)?.inventoryNumber ?? `#${i.assetId}`} — {i.department}
              </option>
            ))}
          </Select>
          <Input
            label="Date entrée atelier"
            type="date"
            value={workshopIn}
            onChange={(e) => setWorkshopIn(e.target.value)}
          />
          <Textarea
            label="Action menée"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            rows={3}
            className="md:col-span-2"
          />
          <Input
            label="Coût"
            type="number"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
          <div className="md:col-span-2">
            <Button type="submit" className="cursor-pointer flex items-center gap-2" variant="primary" disabled={loading}>
              Passer en réparation
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Réparations en cours (alertes)">
        <Table columns={['Matériel', 'État', 'Incident', 'Entrée atelier', 'Action', 'Coût', 'Clôture']}>
          {repairs.map((r) => {
            const incident = r.incident
            const asset = r.incident?.asset ?? (r.incident ? assetsById.get(r.incident.assetId) : undefined)
            return (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {asset ? `${asset.inventoryNumber} — ${asset.brand} ${asset.model}` : `#${r.incidentId}`}
                </td>
                <td className="px-4 py-3">
                  {asset ? <StatusBadge status={asset.status} /> : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  #{r.incidentId} — {incident?.department ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDate(r.workshopIn)}</td>
                <td className="px-4 py-3 text-gray-600">{r.action}</td>
                <td className="px-4 py-3 text-gray-600">{r.cost.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      className="cursor-pointer"
                      onClick={() => handleCloseRepair(r.id, 'EN_SERVICE')}
                      variant="primary"
                      disabled={loading}
                    >
                      En service
                    </Button>
                    <Button
                      className="cursor-pointer"
                      onClick={() => handleCloseRepair(r.id, 'HORS_SERVICE')}
                      variant="danger"
                      disabled={loading}
                    >
                      Hors service
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
          {!repairs.length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                {loading ? 'Chargement…' : 'Aucune réparation en cours.'}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}
