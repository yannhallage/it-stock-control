import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ClipLoader } from 'react-spinners'
import { getAssetByIdService } from '../api/services/assets.service'
import { assetStatusLabel, formatDate } from '../lib/format'
import type { Assignment, HistoryEvent } from '../types'
import type { AssetDetailsApi, RepairFromApi } from '../types'
import { StatusBadge } from '../components/Badge'
import { Button, Card, PageTitle } from '../components/Ui'

function RepairBlock({ repair }: { repair: RepairFromApi }) {
  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold">#{repair.id} — {repair.status}</span>
        <span>
          {formatDate(repair.workshopEntryDate)} → {repair.outcome ?? '—'}
        </span>
      </div>
      <div className="mt-1">
        Action: {repair.action} • Coût: {repair.cost != null ? repair.cost.toFixed(2) : '—'}
      </div>
    </div>
  )
}

const HISTORY_TYPE_LABELS: Record<HistoryEvent['type'], string> = {
  ASSET_CREATED: 'Création du matériel',
  STATUS_CHANGED: 'Changement d\'état',
  ASSIGNMENT_CREATED: 'Affectation créée',
  ASSIGNMENT_ENDED: 'Fin d\'affectation',
  INCIDENT_REPORTED: 'Incident signalé',
  REPAIR_STARTED: 'Réparation démarrée',
  REPAIR_FINISHED: 'Réparation terminée',
}

function formatAssignmentUser(user: Assignment['user']): string {
  if (typeof user === 'string') return user
  if (user && typeof user === 'object' && Array.isArray((user as { names?: string[] }).names))
    return ((user as { names: string[] }).names).join(', ')
  if (user && typeof user === 'object' && 'name' in user) return String((user as { name: string }).name)
  return ''
}

function HistoryTimeline({ events }: { events: HistoryEvent[] }) {
  if (!events.length) {
    return <div className="py-4 text-sm text-slate-600">Aucun événement.</div>
  }
  return (
    <div className="relative">
      {/* Ligne verticale (fil d'Ariane) */}
      <div
        className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200"
        aria-hidden
      />
      <ul className="space-y-0">
        {events.map((h, index) => (
          <li key={h.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Nœud sur le fil */}
            <div
              className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-[10px] font-semibold text-slate-600"
              aria-hidden
            >
              {index + 1}
            </div>
            {/* Contenu */}
            <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-900">
                  {HISTORY_TYPE_LABELS[h.type] ?? h.type}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(h.createdAt).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {Object.keys(h.payload).length > 0 && (
                <dl className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                  {Object.entries(h.payload).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="shrink-0 font-medium text-slate-600">{k}:</dt>
                      <dd className="min-w-0 truncate text-slate-800">
                        {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

type AssetDetails = AssetDetailsApi

export function AssetDetailsPage() {
  const { id } = useParams()
  const [data, setData] = useState<AssetDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function load() {
    if (!id) return
    setError(null)
    setLoading(true)
    getAssetByIdService(Number(id))
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

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/assets"
            className="text-sm text-[var(--color-link)] hover:underline"
          >
            ← Retour à la liste
          </Link>
        </div>
        <Card>
          <div className="asset-details-loading">
            <ClipLoader
              color="var(--color-primary)"
              loading
              size={48}
              aria-label="Chargement du matériel"
            />
            {/* <p className="text-sm font-medium text-slate-600">Chargement du matériel…</p> */}
            <p className="text-xs text-slate-500">Récupération de l’historique et des incidents</p>
          </div>
        </Card>
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
          <Link
            to="/assets"
            className="inline-flex items-center justify-center border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-[var(--color-link)] transition-colors hover:bg-gray-50"
          >
            Retour à la liste
          </Link>
        </div>
      </div>

      <Card title="Affectation actuelle">
        {data.currentAssignment ? (
          <div className="text-sm text-slate-900">
            <b>{data.currentAssignment.department}</b> — {formatAssignmentUser(data.currentAssignment.user)} (depuis{' '}
            {formatDate(data.currentAssignment.startDate)})
          </div>
        ) : (
          <div className="text-sm text-slate-600">Aucune affectation active.</div>
        )}
      </Card>

      <Card title="Historique (mouvements + états + réparations)">
        <HistoryTimeline events={data.history} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Incidents & réparations">
          <div className="space-y-3">
            {data.incidentsWithRepairs.map((i) => (
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
                      <RepairBlock key={r.id} repair={r} />
                    ))}
                    {!i.repairs.length ? (
                      <div className="text-xs text-slate-600">—</div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {!data.incidentsWithRepairs.length ? <div className="text-sm text-slate-600">—</div> : null}
          </div>
        </Card>
      </div>

      <Card title="État actuel">
        <div className="text-sm text-slate-900">
          {assetStatusLabel(data.currentStatus)} (<span className="text-slate-600">{data.currentStatus}</span>)
        </div>
      </Card>

      {/* <div>
        <Button as={Link} to="/assets" variant="outline" className="text-[var(--color-link)]">
          Retour à la liste
        </Button>
      </div> */}
    </div>
  )
}

