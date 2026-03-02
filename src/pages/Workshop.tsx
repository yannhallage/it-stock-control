import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import type { Asset, Incident, Repair } from '../types'
import { StatusBadge } from '../components/Badge'
import { Button, Card, Input, PageTitle, Select, Table, Textarea } from '../components/Ui'

type IncidentRow = Incident & { asset: Asset }
type RepairRow = Repair & { incident: Incident & { asset: Asset } }

export function WorkshopPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([])
  const [repairs, setRepairs] = useState<RepairRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [incidentId, setIncidentId] = useState<number | ''>('')
  const [action, setAction] = useState('')
  const [cost, setCost] = useState('0')
  const [workshopIn, setWorkshopIn] = useState(new Date().toISOString().slice(0, 10))

  const incidentChoices = useMemo(
    () =>
      incidents.filter((i) => {
        // démarre une réparation uniquement sur incident ouvert
        return i.status === 'OUVERT'
      }),
    [incidents],
  )

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([
      api<IncidentRow[]>('/api/incidents?status=OUVERT&with=asset'),
      api<RepairRow[]>('/api/repairs?status=EN_COURS&with=incident'),
    ])
      .then(([i, r]) => {
        setIncidents(i)
        setRepairs(r)
      })
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

  async function startRepair(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!incidentId) {
      toast.warning('Veuillez sélectionner un incident.')
      return
    }
    try {
      await api<Repair>(`/api/incidents/${incidentId}/repairs`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          cost: Number(cost || 0),
          workshopIn,
        }),
      })
      toast.success('Réparation démarrée.')
      setIncidentId('')
      setAction('')
      setCost('0')
      setWorkshopIn(new Date().toISOString().slice(0, 10))
      load()
    } catch (err: any) {
      const msg = String(err?.message ?? err)
      setError(msg)
      toast.error(msg || 'Erreur lors du démarrage de la réparation.')
    }
  }

  async function finishRepair(repairId: number, outcome: 'EN_SERVICE' | 'HORS_SERVICE') {
    setError(null)
    try {
      await api<Repair>(`/api/repairs/${repairId}/finish`, {
        method: 'POST',
        body: JSON.stringify({
          workshopOut: new Date().toISOString().slice(0, 10),
          outcome,
        }),
      })
      toast.success(outcome === 'EN_SERVICE' ? 'Matériel remis en service.' : 'Matériel marqué hors service.')
      load()
    } catch (err: any) {
      const msg = String(err?.message ?? err)
      setError(msg)
      toast.error(msg || 'Erreur lors de la clôture de la réparation.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle>Suivi Atelier</PageTitle>
        <Button onClick={load} disabled={loading}>
          Actualiser
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card title="Démarrer une réparation (En Panne → En Réparation)">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={startRepair}>
          <Select
            label="Incident"
            value={incidentId}
            onChange={(e) => setIncidentId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Sélectionner…</option>
            {incidentChoices.map((i) => (
              <option key={i.id} value={i.id}>
                #{i.id} — {i.asset.inventoryNumber} — {i.department}
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
            <Button type="submit" className="cursor-pointer" variant="primary" disabled={loading}>
              Passer en réparation
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Réparations en cours (alertes)">
        <Table columns={['Matériel', 'État', 'Incident', 'Entrée atelier', 'Action', 'Coût', 'Clôture']}>
          {repairs.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {r.incident.asset.inventoryNumber} — {r.incident.asset.brand} {r.incident.asset.model}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={r.incident.asset.status} />
              </td>
              <td className="px-4 py-3 text-gray-600">
                #{r.incidentId} — {r.incident.department}
              </td>
              <td className="px-4 py-3 text-gray-600">{formatDate(r.workshopIn)}</td>
              <td className="px-4 py-3 text-gray-600">{r.action}</td>
              <td className="px-4 py-3 text-gray-600">{r.cost.toFixed(2)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button className="cursor-pointer" onClick={() => finishRepair(r.id, 'EN_SERVICE')} variant="primary">
                    En service
                  </Button>
                  <Button className="cursor-pointer" onClick={() => finishRepair(r.id, 'HORS_SERVICE')} variant="danger">
                    Hors service
                  </Button>
                </div>
              </td>
            </tr>
          ))}
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

