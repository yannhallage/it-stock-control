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

// function AssignIcon({ className }: { className?: string }) {
//   return (
//     <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
//       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h12" />
//     </svg>
//   )
// }

// function IncidentIcon({ className }: { className?: string }) {
//   return (
//     <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
//       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01" />
//       <path
//         strokeLinecap="round"
//         strokeLinejoin="round"
//         strokeWidth={2}
//         d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
//       />
//     </svg>
//   )
// }

// function RepairIcon({ className }: { className?: string }) {
//   return (
//     <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
//       <path
//         strokeLinecap="round"
//         strokeLinejoin="round"
//         strokeWidth={2}
//         d="M14.7 6.3a4 4 0 01-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.1 2.1-3-3 2.1-2.1z"
//       />
//     </svg>
//   )
// }

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
  ASSET_UPDATED: 'Matériel modifié',
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

function formatHistoryPayloadValue(value: unknown): string {
  if (value == null) return '—'

  if (typeof value === 'string') {
    const timestamp = Date.parse(value)
    if (!Number.isNaN(timestamp) && value.includes('T')) {
      return new Date(timestamp).toLocaleDateString('fr-FR')
    }
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatHistoryPayloadValue(item)).join(', ')
  }

  if (typeof value === 'object') {
    if ('name' in value && typeof (value as { name?: unknown }).name === 'string') {
      return (value as { name: string }).name
    }
    if ('names' in value && Array.isArray((value as { names?: unknown }).names)) {
      return ((value as { names: string[] }).names).join(', ')
    }
    return Object.values(value as Record<string, unknown>)
      .map((item) => formatHistoryPayloadValue(item))
      .filter(Boolean)
      .join(' - ')
  }

  return String(value)
}

function HistoryTimeline({ events }: { events: HistoryEvent[] }) {
  if (!events.length) {
    return <div className="py-4 text-sm text-slate-600">Aucun événement.</div>
  }
  return (
    <div className="relative py-2">
      <div
        className="absolute bottom-0 left-3 top-0 w-px bg-slate-200 md:left-1/2 md:-translate-x-1/2"
        aria-hidden
      />
      <ul className="space-y-7 md:space-y-10">
        {events.map((h, index) => {
          const isLeft = index % 2 === 0
          const dateLabel = new Date(h.createdAt).toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <li key={h.id} className="relative md:grid md:grid-cols-[1fr_160px_1fr] md:items-start md:gap-6">
              <div
                className={`ml-10 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:ml-0 ${
                  isLeft ? 'md:col-start-1' : 'md:col-start-3'
                }`}
              >
                <div className="mb-1 text-xs font-medium text-slate-500 md:hidden">{dateLabel}</div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{HISTORY_TYPE_LABELS[h.type] ?? h.type}</span>
                  <span className="text-xs text-slate-500">#{index + 1}</span>
                </div>
                {Object.keys(h.payload).length > 0 ? (
                  <dl className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                    {Object.entries(h.payload).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="shrink-0 font-medium text-slate-600">{k}:</dt>
                        <dd className="min-w-0 truncate text-slate-800">
                          {formatHistoryPayloadValue(v)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="mt-2 text-xs text-slate-500">Aucun détail supplémentaire.</div>
                )}
              </div>

              <div className="pointer-events-none absolute left-3 top-4 md:static md:col-start-2 md:flex md:flex-col md:items-center">
                <span className="hidden rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 md:inline-flex">
                  {dateLabel}
                </span>
                <span className="mt-2 block h-4 w-4 rounded-full border-2 border-slate-400 bg-white md:mt-3" />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type AssetDetails = AssetDetailsApi
type DetailsTab = 'timeline' | 'incidents' | 'repairs'

export function AssetDetailsPage() {
  const { id } = useParams()
  const [data, setData] = useState<AssetDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailsTab>('timeline')

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
              color="#475569"
              loading={loading}
              size={42}
              speedMultiplier={0.85}
              cssOverride={{
                display: 'block',
                margin: '0 auto',
                borderWidth: '4px',
              }}
              aria-label="Chargement du matériel"
            />
            {/* <p className="text-sm font-medium text-slate-600">Chargement du matériel…</p> */}
            <p className="text-xs text-slate-500">Récupération de l’historique et des incidents</p>
          </div>
        </Card>
      </div>
    )
  }

  const allRepairs = data.incidentsWithRepairs.flatMap((incident) => incident.repairs)
  const openIncidents = data.incidentsWithRepairs.filter((incident) => incident.status !== 'CLOS').length
  const ongoingRepairs = allRepairs.filter((repair) => repair.status !== 'FINISHED').length
  const totalRepairCost = allRepairs.reduce((sum, repair) => sum + (repair.cost ?? 0), 0)

  const timelineContent = (
    <Card title="Chronologie des événements">
      <HistoryTimeline events={data.history} />
    </Card>
  )

  const incidentsContent = (
    <Card title="Incidents">
      <div className="mb-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-slate-600">Incidents ouverts</div>
          <div className="text-base font-semibold text-slate-900">{openIncidents}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-slate-600">Réparations en cours</div>
          <div className="text-base font-semibold text-slate-900">{ongoingRepairs}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-slate-600">Coût total réparations</div>
          <div className="text-base font-semibold text-slate-900">{totalRepairCost.toFixed(2)}</div>
        </div>
      </div>
      <div className="space-y-3">
        {data.incidentsWithRepairs.map((i) => (
          <details key={i.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-900">Incident #{i.id}</span>
              <span className="text-xs text-slate-600">{formatDate(i.reportedAt)}</span>
            </summary>
            <div className="mt-2 text-sm text-slate-700">
              <b>{i.department}</b> - {i.description}
            </div>
            <div className="mt-2 text-xs text-slate-600">Statut incident: {i.status}</div>
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-900">Réparations</div>
              <div className="mt-2 space-y-2">
                {i.repairs.map((r) => (
                  <RepairBlock key={r.id} repair={r} />
                ))}
                {!i.repairs.length ? <div className="text-xs text-slate-600">Aucune réparation.</div> : null}
              </div>
            </div>
          </details>
        ))}
        {!data.incidentsWithRepairs.length ? <div className="text-sm text-slate-600">Aucun incident.</div> : null}
      </div>
    </Card>
  )

  const repairsContent = (
    <Card title="Réparations">
      <div className="space-y-2">
        {allRepairs.map((repair) => (
          <RepairBlock key={repair.id} repair={repair} />
        ))}
        {!allRepairs.length ? <div className="text-sm text-slate-600">Aucune réparation enregistrée.</div> : null}
      </div>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="sticky top-2 z-10 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <PageTitle>
              {data.inventoryNumber} - {data.type}
            </PageTitle>
            <div className="text-sm text-slate-600">
              {data.brand} {data.model} - Entrée {formatDate(data.entryDate)} - Fournisseur {data.supplier}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge status={data.status} />
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                État: {assetStatusLabel(data.currentStatus)}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                Affectation: {data.currentAssignment ? data.currentAssignment.department : 'Aucune'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* <Button className="inline-flex h-8 min-w-[34px] cursor-pointer items-center gap-1.5 rounded px-3 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60">
              <AssignIcon className="h-3.5 w-3.5" />
              Affecter
            </Button>
            <Button className="inline-flex h-8 min-w-[34px] cursor-pointer items-center gap-1.5 rounded px-3 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60">
              <IncidentIcon className="h-3.5 w-3.5" />
              Déclarer incident
            </Button>
            <Button className="inline-flex h-8 min-w-[34px] cursor-pointer items-center gap-1.5 rounded px-3 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60">
              <RepairIcon className="h-3.5 w-3.5" />
              Mettre en réparation
            </Button> */}
            <Button
              onClick={load}
              disabled={loading}
              className="h-8 min-w-[34px] cursor-pointer rounded px-3 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            >
              Actualiser
            </Button>
            <Link
              to="/assets"
              className="inline-flex h-8 items-center rounded border border-slate-200 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-gray-50"
            >
              Retour à la liste
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Activité">
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'timeline'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('incidents')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'incidents'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Incidents
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('repairs')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'repairs'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Réparations
              </button>
            </div>
            {activeTab === 'timeline' ? timelineContent : null}
            {activeTab === 'incidents' ? incidentsContent : null}
            {activeTab === 'repairs' ? repairsContent : null}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="État actuel">
            <div className="text-sm text-slate-900">
              {assetStatusLabel(data.currentStatus)} (<span className="text-slate-600">{data.currentStatus}</span>)
            </div>
          </Card>

          <Card title="Affectation actuelle">
            {data.currentAssignment ? (
              <div className="text-sm text-slate-900">
                <b>{data.currentAssignment.department}</b> - {formatAssignmentUser(data.currentAssignment.user)} (depuis{' '}
                {formatDate(data.currentAssignment.startDate)})
              </div>
            ) : (
              <div className="text-sm text-slate-600">Aucune affectation active.</div>
            )}
          </Card>

          <Card title="Informations administratives">
            <div className="space-y-1 text-sm text-slate-700">
              <div><span className="font-medium text-slate-900">Type:</span> {data.type}</div>
              <div><span className="font-medium text-slate-900">Marque:</span> {data.brand}</div>
              <div><span className="font-medium text-slate-900">Modèle:</span> {data.model}</div>
              <div><span className="font-medium text-slate-900">Entrée:</span> {formatDate(data.entryDate)}</div>
              <div><span className="font-medium text-slate-900">Fournisseur:</span> {data.supplier}</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

