import { useCallback, useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useIncidents } from '../api/hooks/useIncidents'
import { useWorkshop } from '../api/hooks/useWorkshop'
import type { RepairWithRelations } from '../api/services/workshop.service'
import { formatDate } from '../lib/format'
import type { Asset, Incident } from '../types'
import { StatusBadge } from '../components/Badge'
import { DrawerStartRepair } from '../components/drawers/DrawerStartRepair'
import { Button, Card, Input, PageTitle, Table } from '../components/Ui'

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getWorkshopEntryDate(repair: RepairWithRelations) {
  return repair.workshopEntryDate ?? repair.workshopIn
}

function getWorkshopExitDate(repair: RepairWithRelations) {
  return repair.workshopExitDate ?? repair.workshopOut
}

function repairOutcomeLabel(outcome: RepairWithRelations['outcome']) {
  switch (outcome) {
    case 'EN_SERVICE':
      return 'En service'
    case 'HORS_SERVICE':
      return 'Hors service'
    default:
      return 'Clôturée'
  }
}

export function WorkshopPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [repairs, setRepairs] = useState<RepairWithRelations[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [startRepairDrawerOpen, setStartRepairDrawerOpen] = useState(false)

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

  const filteredRepairs = useMemo(() => {
    const query = normalizeText(searchTerm.trim())
    if (!query) return repairs

    return repairs.filter((r) => {
      const asset = r.incident?.asset ?? (r.incident ? assetsById.get(r.incident.assetId) : undefined)
      const entryDate = getWorkshopEntryDate(r)
      const exitDate = getWorkshopExitDate(r)
      const searchable = [
        r.technicianName ?? '',
        r.action ?? '',
        repairOutcomeLabel(r.outcome),
        r.status,
        r.incident?.department ?? '',
        r.incident?.description ?? '',
        `#${r.incidentId}`,
        asset?.inventoryNumber ?? '',
        asset?.brand ?? '',
        asset?.model ?? '',
        asset?.type ?? '',
        formatDate(entryDate) || '',
        formatDate(exitDate) || '',
        entryDate ?? '',
        exitDate ?? '',
      ].join(' ')
      return normalizeText(searchable).includes(query)
    })
  }, [assetsById, repairs, searchTerm])

  const load = useCallback(() => {
    setError(null)
    Promise.all([
      fetchAssets(),
      fetchIncidents({ status: 'OUVERT' }),
      fetchRepairs(),
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
  }, [fetchAssets, fetchIncidents, fetchRepairs])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Suivi Atelier</PageTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            onClick={() => setStartRepairDrawerOpen(true)}
            disabled={loading}
          >
            Démarrer une réparation
          </Button>
          <Button
            type="button"
            onClick={load}
            disabled={loading}
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
          >
            Actualiser
          </Button>
        </div>
      </div>

      {error ?? apiError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? apiError}
        </div>
      ) : null}

      <DrawerStartRepair
        isOpen={startRepairDrawerOpen}
        onClose={() => setStartRepairDrawerOpen(false)}
        onSuccess={load}
        incidentChoices={incidentChoices}
        assetsById={assetsById}
        startRepair={startRepair}
      />

      <Card title="Réparations atelier">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-6 lg:col-span-4">
            <Input
              label="Rechercher"
              placeholder="Technicien, matériel, incident, action, date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Table columns={['Matériel', 'État', 'Incident', 'Entrée atelier', 'Sortie atelier', 'Technicien', 'Action', 'Clôture']}>
          {filteredRepairs.map((r) => {
            const incident = r.incident
            const asset = r.incident?.asset ?? (r.incident ? assetsById.get(r.incident.assetId) : undefined)
            const workshopExitDate = getWorkshopExitDate(r)
            const isClosed = r.status === 'TERMINE'
            const isAlreadyInService = asset?.status === 'EN_SERVICE'
            const isAlreadyOutOfService = asset?.status === 'HORS_SERVICE'
            const enServiceDisabled = loading || isAlreadyInService
            const horsServiceDisabled = loading || isAlreadyInService || isAlreadyOutOfService
            return (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-[13px]">
                  {asset ? `${asset.inventoryNumber} — ${asset.brand} ${asset.model}` : `#${r.incidentId}`}
                </td>
                <td className="px-4 py-3 text-[13px]">
                  {asset ? <StatusBadge status={asset.status} /> : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-[13px]">
                  #{r.incidentId} — {incident?.department ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-[13px]">
                  {formatDate(getWorkshopEntryDate(r)) || '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-[13px]">
                  {formatDate(workshopExitDate) || (isClosed ? '—' : 'En atelier')}
                </td>
                <td className="px-4 py-3 text-gray-600 text-[13px]">{r.technicianName || '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-[13px]">{r.action}</td>
                <td className="px-4 py-3">
                  {isClosed ? (
                    <span className="inline-flex rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      {repairOutcomeLabel(r.outcome)}
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                        onClick={() => {
                          if (isAlreadyInService) return
                          handleCloseRepair(r.id, 'EN_SERVICE')
                        }}
                        variant="default"
                        disabled={enServiceDisabled}
                        title={isAlreadyInService ? 'Aucune action possible: matériel déjà en service' : 'Marquer en service'}
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path
                            fillRule="evenodd"
                            d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.24 7.3a1 1 0 0 1-1.43-.003l-3.75-3.8a1 1 0 1 1 1.423-1.404l3.039 3.077 6.532-6.584a1 1 0 0 1 1.42 0Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        En service
                      </Button>
                      <Button
                        className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                        onClick={() => {
                          if (isAlreadyInService || isAlreadyOutOfService) return
                          handleCloseRepair(r.id, 'HORS_SERVICE')
                        }}
                        variant="danger"
                        disabled={horsServiceDisabled}
                        title={
                          isAlreadyInService
                            ? 'Aucune action possible: matériel déjà en service'
                            : isAlreadyOutOfService
                              ? 'Aucune action possible: matériel déjà hors service'
                              : 'Marquer hors service'
                        }
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Hors service
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
          {!filteredRepairs.length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                {loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : repairs.length ? (
                  'Aucune réparation ne correspond à la recherche.'
                ) : (
                  'Aucune réparation en cours.'
                )}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}
