import { useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useImpression } from '../api/hooks/useImpression'
import { useIncidents } from '../api/hooks/useIncidents'
import { ReportIncidentDrawer } from '../components/drawers/ReportIncidentDrawer'
import { formatBrandModel, getDepartmentName, getTypeName } from '../lib/asset-labels'
import { formatDate } from '../lib/format'
import type { Asset, Incident } from '../types'
import { Button, Card, PageTitle, Table } from '../components/Ui'

export function IncidentsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [items, setItems] = useState<Incident[]>([])
  const [error, setError] = useState<string | null>(null)

  const [reportDrawerOpen, setReportDrawerOpen] = useState(false)

  const { fetchAssets, loading: assetsLoading } = useAssets()
  const { fetchIncidents, loading: incidentsLoading, error: apiError } = useIncidents()
  const { downloadReport, loading: printLoading, error: printError } = useImpression()

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Gestion des Pannes</PageTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            onClick={() => setReportDrawerOpen(true)}
            disabled={loading}
          >
            Signaler un problème
          </Button>
          <Button onClick={load} className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" disabled={loading}>
            Actualiser
          </Button>
          <Button
            type="button"
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            onClick={async () => {
              try {
                await downloadReport('incidents')
                toast.success('Rapport PDF téléchargé.')
              } catch {
                toast.error("Erreur lors de l'impression du rapport.")
              }
            }}
            disabled={loading || printLoading}
            title="Imprimer"
          >
            Imprimer
          </Button>
        </div>
      </div>

      {error ?? apiError ?? printError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? apiError ?? printError}
        </div>
      ) : null}

      <ReportIncidentDrawer
        isOpen={reportDrawerOpen}
        onClose={() => setReportDrawerOpen(false)}
        assets={assets}
        onCreated={load}
      />

      <Card title="Pannes en cours (incidents ouverts)">
        <Table columns={['Inventaire', 'Matériel', 'Direction', 'Signalé le', 'Description']}>
          {items.map((it) => {
            const a = assetsById.get(it.assetId)
            return (
              <tr key={it.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-[13px]">
                  {a?.inventoryNumber ?? `#${it.assetId}`}
                </td>
                <td className="px-4 py-3 text-gray-600 text-[13px]">
                  {a ? `${getTypeName(a)} — ${formatBrandModel(a)}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-[13px]">{getDepartmentName(it)}</td>
                <td className="px-4 py-3 text-gray-600 text-[13px]">
                  {formatDate(it.reportedAt)}
                </td>
                <td className="px-4 py-3 text-gray-600 text-[13px]">{it.description}</td>
              </tr>
            )
          })}
          {!items.length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                {loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : (
                  'Aucune panne en cours.'
                )}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}
