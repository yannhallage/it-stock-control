import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import type { Asset, AssetStatus, Assignment } from '../types'
import { StatusBadge } from '../components/Badge'
import { Button, Card, Input, PageTitle, Select, Table } from '../components/Ui'

type AssetRow = Asset & { activeAssignment: Assignment | null }

export function AssignmentsPage() {
  const [items, setItems] = useState<AssetRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [assetId, setAssetId] = useState<number | ''>('')
  const [department, setDepartment] = useState('')
  const [user, setUser] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))

  const assignable = useMemo(() => {
    const blocked: AssetStatus[] = ['EN_PANNE', 'EN_REPARATION', 'HORS_SERVICE']
    return items.filter((a) => !blocked.includes(a.status))
  }, [items])

  function load() {
    setLoading(true)
    setError(null)
    api<AssetRow[]>('/api/assets?with=activeAssignment')
      .then(setItems)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        setError(msg)
        toast.error(msg || 'Erreur lors du chargement.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!assetId) {
      toast.warning('Veuillez sélectionner un matériel.')
      return
    }
    try {
      await api<Assignment>(`/api/assets/${assetId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({ department, user, startDate }),
      })
      toast.success('Affectation créée avec succès.')
      setAssetId('')
      setDepartment('')
      setUser('')
      setStartDate(new Date().toISOString().slice(0, 10))
      load()
    } catch (err: any) {
      const msg = String(err?.message ?? err)
      setError(msg)
      toast.error(msg || 'Erreur lors de l\'affectation.')
    }
  }

  async function endAssignment(id: number) {
    setError(null)
    try {
      await api<{ ok: true }>(`/api/assignments/${id}/end`, { method: 'POST' })
      toast.success('Affectation clôturée.')
      load()
    } catch (err: any) {
      const msg = String(err?.message ?? err)
      setError(msg)
      toast.error(msg || 'Erreur lors de la clôture.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle>Affectations</PageTitle>
        <Button onClick={load} className="cursor-pointer" disabled={loading}>
          Actualiser
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card title="Transférer un matériel du Stock vers une Direction">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-4" onSubmit={createAssignment}>
          <Select
            label="Matériel"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Sélectionner…</option>
            {assignable.map((a) => (
              <option key={a.id} value={a.id}>
                {a.inventoryNumber} — {a.type} — {a.brand} {a.model}
              </option>
            ))}
          </Select>
          <Input
            label="Direction / Service"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
          <Input
            label="Utilisateur"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <Input
            label="Date début"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <div className="md:col-span-4">
            <Button type="submit" className="cursor-pointer" variant="primary" disabled={loading}>
              Affecter / transférer
            </Button>
          </div>
        </form>
        <div className="mt-3 text-xs text-slate-600">
          Une nouvelle affectation clôt automatiquement l’affectation active précédente (si existante).
        </div>
      </Card>

      <Card title="Affectations actives">
        <Table columns={['Inventaire', 'Matériel', 'État', 'Direction', 'Utilisateur', 'Début', 'Action']}>
          {items
            .filter((a) => a.activeAssignment)
            .map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="border-b border-slate-100 px-3 py-2 font-medium text-gray-900">
                  {a.inventoryNumber}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  {a.type} — {a.brand} {a.model}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <StatusBadge status={a.status} />
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  {a.activeAssignment?.department}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  {a.activeAssignment?.user}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  {formatDate(a.activeAssignment?.startDate ?? '')}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <Button
                    onClick={() => endAssignment(a.activeAssignment!.id)}
                    variant="default"
                    className="cursor-pointer"
                  >
                    Fin d’affectation
                  </Button>
                </td>
              </tr>
            ))}
          {!items.filter((a) => a.activeAssignment).length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                {loading ? 'Chargement…' : 'Aucune affectation active.'}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}

