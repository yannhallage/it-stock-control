import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api } from '../lib/api'
import { assetStatusLabel, formatDate } from '../lib/format'
import type { Asset, Assignment, HistoryEvent, Incident, Repair } from '../types'
import { StatusBadge } from '../components/Badge'
import { Button, Card, PageTitle, Table } from '../components/Ui'

type AssetDetails = Asset & {
  assignments: Assignment[]
  incidents: (Incident & { repairs: Repair[] })[]
  history: HistoryEvent[]
  activeAssignment: Assignment | null
}

export function AssetDetailsPage() {
  const { id } = useParams()
  const [data, setData] = useState<AssetDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function load() {
    if (!id) return
    setError(null)
    setLoading(true)
    api<AssetDetails>(`/api/assets/${id}`)
      .then(setData)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        setError(msg)
        toast.error(msg || 'Erreur lors du chargement.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (error) {
    return (
      <div className="space-y-4">
        <Link className="text-[var(--color-link)] hover:underline" to="/assets">
          Retour
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      </div>
    )
  }

  if (!data && !error) {
    return (
      <div className="py-12 text-center text-gray-500">
        Chargement…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <PageTitle>
            {data.inventoryNumber} — {data.type}
          </PageTitle>
          <div className="text-sm text-slate-600">
            {data.brand} {data.model} • Entrée {formatDate(data.entryDate)} • Fournisseur {data.supplier}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={data.status} />
          <Button onClick={load} disabled={loading} className="flex items-center gap-2">
            Actualiser
          </Button>
        </div>
      </div>

      <Card title="Affectation actuelle">
        {data.activeAssignment ? (
          <div className="text-sm text-slate-900">
            <b>{data.activeAssignment.department}</b> — {data.activeAssignment.user} (depuis{' '}
            {formatDate(data.activeAssignment.startDate)})
          </div>
        ) : (
          <div className="text-sm text-slate-600">Aucune affectation active.</div>
        )}
      </Card>

      <Card title="Historique (mouvements + états + réparations)">
        <div className="space-y-2">
          {data.history.map((h) => (
            <div key={h.id} className="border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">{h.type}</span>
                <span className="text-slate-600">{new Date(h.createdAt).toLocaleString('fr-FR')}</span>
              </div>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">
                {JSON.stringify(h.payload, null, 2)}
              </pre>
            </div>
          ))}
          {!data.history.length ? <div className="text-sm text-slate-600">—</div> : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Affectations (historique)">
          <Table columns={['Direction', 'Utilisateur', 'Début', 'Fin']}>
            {data.assignments.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{a.department}</td>
                <td className="px-4 py-3 text-gray-600">{a.user}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(a.startDate)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {a.endDate ? formatDate(a.endDate) : '—'}
                </td>
              </tr>
            ))}
            {!data.assignments.length ? (
              <tr>
                <td className="border-b border-slate-100 px-3 py-6 text-slate-600" colSpan={4}>
                  —
                </td>
              </tr>
            ) : null}
          </Table>
        </Card>

        <Card title="Incidents & réparations">
          <div className="space-y-3">
            {data.incidents.map((i) => (
              <div key={i.id} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="font-semibold text-slate-900">Incident #{i.id}</div>
                  <div className="text-xs text-slate-600">{formatDate(i.reportedAt)}</div>
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  <b>{i.department}</b> — {i.description}
                </div>
                <div className="mt-2 text-xs text-slate-600">Statut incident: {i.status}</div>

                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-900">Réparations</div>
                  <div className="mt-2 space-y-2">
                    {i.repairs.map((r) => (
                      <div key={r.id} className="rounded border border-gray-200 bg-gray-50 p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">#{r.id} — {r.status}</span>
                          <span>
                            {formatDate(r.workshopIn)} → {r.workshopOut ? formatDate(r.workshopOut) : '—'}
                          </span>
                        </div>
                        <div className="mt-1">
                          Action: {r.action} • Coût: {r.cost.toFixed(2)}
                        </div>
                      </div>
                    ))}
                    {!i.repairs.length ? (
                      <div className="text-xs text-slate-600">—</div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {!data.incidents.length ? <div className="text-sm text-slate-600">—</div> : null}
          </div>
        </Card>
      </div>

      <Card title="État actuel">
        <div className="text-sm text-slate-900">
          {assetStatusLabel(data.status)} (<span className="text-slate-600">{data.status}</span>)
        </div>
      </Card>

      <div>
        <Link className="text-[var(--color-link)] hover:underline" to="/assets">
          Retour à la liste
        </Link>
      </div>
    </div>
  )
}

