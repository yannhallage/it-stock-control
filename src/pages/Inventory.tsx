import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useDepartments } from '../api/hooks/useDepartments'
import { useImpression } from '../api/hooks/useImpression'
import { useMaterialTypes } from '../api/hooks/useMaterialTypes'
import { listKnownUsersFromAssignmentsService } from '../api/services/assignments.service'
import type { ListAssetsParams } from '../api/services/assets.service'
import {
  formatUserName,
  getBrandName,
  getDepartmentName,
  getTypeName,
} from '../lib/asset-labels'
import { formatDate } from '../lib/format'
import type {
  Asset,
  AssetStatus,
  AssignmentUser,
  InventoryColumnKey,
  InventorySummary,
} from '../types'
import { StatusBadge } from '../components/Badge'
import { Button, Card, Input, PageTitle, Select, Table } from '../components/Ui'

const DEFAULT_COLUMNS: InventoryColumnKey[] = [
  'inventoryNumber',
  'type',
  'brandModel',
  'lastName',
  'firstName',
  'direction',
  'status',
  'entryDate',
]

const ALL_COLUMNS: Array<{ key: InventoryColumnKey; label: string; optional?: boolean }> = [
  { key: 'inventoryNumber', label: 'N° inventaire' },
  { key: 'type', label: 'Type' },
  { key: 'brandModel', label: 'Marque / Modèle' },
  { key: 'lastName', label: 'Nom' },
  { key: 'firstName', label: 'Prénom' },
  { key: 'direction', label: 'Direction' },
  { key: 'status', label: 'État' },
  { key: 'entryDate', label: 'Date entrée' },
  { key: 'warranty', label: 'Garantie', optional: true },
  { key: 'supplier', label: 'Fournisseur', optional: true },
  { key: 'serialNumber', label: 'N° série', optional: true },
  { key: 'location', label: 'Emplacement', optional: true },
]

const STATUS_OPTIONS: Array<{ value: AssetStatus | ''; label: string }> = [
  { value: '', label: 'Tous les états' },
  { value: 'EN_STOCK_NON_AFFECTE', label: 'Stock / Non affecté' },
  { value: 'AFFECTE', label: 'Affecté' },
  { value: 'EN_PRET', label: 'En prêt' },
  { value: 'EN_PANNE', label: 'En panne' },
  { value: 'EN_REPARATION', label: 'En réparation' },
  { value: 'EN_SERVICE', label: 'En service' },
  { value: 'HORS_SERVICE', label: 'Hors service' },
]

function matchTypePreset(name: string, keywords: string[]): boolean {
  const n = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  return keywords.some((k) => n.includes(k))
}

function cellValue(asset: Asset, key: InventoryColumnKey): string {
  const assignment = asset.currentAssignment
  switch (key) {
    case 'inventoryNumber':
      return asset.inventoryNumber
    case 'type':
      return getTypeName(asset)
    case 'brandModel':
      return `${getBrandName(asset)} / ${asset.model}`
    case 'firstName':
      return assignment?.user?.firstName ?? '—'
    case 'lastName':
      return assignment?.user?.lastName ?? '—'
    case 'direction':
      return assignment ? getDepartmentName(assignment) : '—'
    case 'status':
      return asset.status.replace(/_/g, ' ')
    case 'entryDate':
      return formatDate(asset.entryDate)
    case 'warranty':
      return asset.warrantyEndDate
        ? `${formatDate(asset.warrantyStartDate)} → ${formatDate(asset.warrantyEndDate)}`
        : '—'
    case 'supplier':
      return asset.supplier?.name ?? '—'
    case 'serialNumber':
      return asset.serialNumber ?? '—'
    case 'location':
      return asset.location?.name ?? '—'
    default:
      return '—'
  }
}

function exportCsv(assets: Asset[], columns: InventoryColumnKey[]) {
  const headers = ['#', ...columns.map((c) => ALL_COLUMNS.find((x) => x.key === c)?.label ?? c)]
  const lines = [
    headers.join(';'),
    ...assets.map((asset, index) =>
      [String(index + 1), ...columns.map((col) => `"${cellValue(asset, col).replace(/"/g, '""')}"`)].join(
        ';',
      ),
    ),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'inventaire-parc.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<Asset[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [materialTypes, setMaterialTypes] = useState<Array<{ id: number; name: string }>>([])
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])
  const [knownUsers, setKnownUsers] = useState<AssignmentUser[]>([])
  const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([])
  const [columns, setColumns] = useState<InventoryColumnKey[]>(DEFAULT_COLUMNS)
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState<AssetStatus | ''>('')
  const [search, setSearch] = useState('')
  const [warrantyExpired, setWarrantyExpired] = useState(false)
  const [minAgeYears, setMinAgeYears] = useState<number | ''>('')
  const [physicalPendingOnly, setPhysicalPendingOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    fetchAssets,
    fetchInventorySummary,
    markPhysicalInventory,
    loading,
    error: apiError,
  } = useAssets()
  const { fetchMaterialTypes } = useMaterialTypes()
  const { fetchDepartments } = useDepartments()
  const {
    downloadInventoryReport,
    downloadSignaleticReport,
    loading: printLoading,
    error: printError,
  } = useImpression()

  const buildParams = useCallback((): ListAssetsParams => {
    return {
      q: search.trim() || undefined,
      status: status || undefined,
      departmentId: departmentId === '' ? undefined : departmentId,
      userId: userId || undefined,
      materialTypeIds: selectedTypeIds.length > 0 ? selectedTypeIds : undefined,
      warrantyExpired: warrantyExpired || undefined,
      minAgeYears: minAgeYears === '' ? undefined : minAgeYears,
      physicalInventoryPending: physicalPendingOnly || undefined,
    }
  }, [
    departmentId,
    minAgeYears,
    physicalPendingOnly,
    search,
    selectedTypeIds,
    status,
    userId,
    warrantyExpired,
  ])

  const load = useCallback(async () => {
    setError(null)
    const params = buildParams()
    try {
      const [assets, synth] = await Promise.all([
        fetchAssets(params),
        fetchInventorySummary(params),
      ])
      setItems(assets)
      setSummary(synth)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      toast.error(msg || 'Erreur lors du chargement inventaire.')
    }
  }, [buildParams, fetchAssets, fetchInventorySummary])

  useEffect(() => {
    Promise.all([
      fetchMaterialTypes(),
      fetchDepartments(),
      listKnownUsersFromAssignmentsService(),
    ])
      .then(([types, depts, users]) => {
        setMaterialTypes(types ?? [])
        setDepartments(depts ?? [])
        setKnownUsers(users ?? [])
      })
      .catch(() => toast.error('Erreur chargement référentiels inventaire.'))
  }, [fetchDepartments, fetchMaterialTypes])

  useEffect(() => {
    const dept = searchParams.get('departmentId')
    const st = searchParams.get('status')
    const renew = searchParams.get('renew')
    const pending = searchParams.get('physicalPending')

    if (dept) setDepartmentId(Number(dept))
    if (st) setStatus(st as AssetStatus)
    if (renew === '1') {
      setWarrantyExpired(true)
      setMinAgeYears(4)
    }
    if (pending === '1') setPhysicalPendingOnly(true)
  }, [searchParams])

  useEffect(() => {
    const preset = searchParams.get('preset')
    if (!preset || materialTypes.length === 0) return

    const map: Record<string, string[]> = {
      pc: ['pc', 'bureau', 'desktop'],
      laptop: ['laptop', 'portable', 'notebook'],
      imprimante: ['imprimante', 'printer'],
      onduleur: ['onduleur', 'ups'],
    }
    const keys = map[preset]
    if (keys) {
      const ids = materialTypes.filter((t) => matchTypePreset(t.name, keys)).map((t) => t.id)
      setSelectedTypeIds(ids)
    }
  }, [materialTypes, searchParams])

  useEffect(() => {
    void load()
    // Chargement initial + quand les filtres structurés changent (pas la saisie libre)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTypeIds,
    departmentId,
    userId,
    status,
    warrantyExpired,
    minAgeYears,
    physicalPendingOnly,
  ])

  const pdfFilters = useMemo(
    () => ({
      ...buildParams(),
      columns,
    }),
    [buildParams, columns],
  )

  const tableColumns = useMemo(
    () => ['#', ...columns.map((c) => ALL_COLUMNS.find((x) => x.key === c)?.label ?? c), 'Actions'],
    [columns],
  )

  function toggleType(id: number) {
    setSelectedTypeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleColumn(key: InventoryColumnKey) {
    setColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    )
  }

  function applyPresetTypes(keywords: string[]) {
    const ids = materialTypes.filter((t) => matchTypePreset(t.name, keywords)).map((t) => t.id)
    setSelectedTypeIds(ids)
    setWarrantyExpired(false)
    setMinAgeYears('')
    setSearchParams({})
  }

  function resetFilters() {
    setSelectedTypeIds([])
    setDepartmentId('')
    setUserId('')
    setStatus('')
    setSearch('')
    setWarrantyExpired(false)
    setMinAgeYears('')
    setPhysicalPendingOnly(false)
    setColumns(DEFAULT_COLUMNS)
    setSearchParams({})
  }

  async function handlePdf() {
    try {
      await downloadInventoryReport(pdfFilters)
      toast.success('Rapport PDF téléchargé.')
    } catch {
      toast.error("Erreur lors de l'export PDF.")
    }
  }

  async function handleCsv() {
    exportCsv(items, columns)
    toast.success('Export CSV téléchargé.')
  }

  async function handleSignaletic() {
    try {
      await downloadSignaleticReport(pdfFilters)
      toast.success('Fiches signalétiques téléchargées.')
    } catch {
      toast.error('Erreur lors de l’impression des fiches.')
    }
  }

  async function handleMarkInventoried(assetId: number) {
    try {
      await markPhysicalInventory(assetId)
      toast.success('Matériel marqué inventorié.')
      await load()
    } catch {
      toast.error('Impossible de marquer l’inventaire.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle>Inventaire</PageTitle>
          <p className="mt-1 text-sm text-gray-500">
            Pilotage du parc, rapports Direction et inventaire physique
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-7 cursor-pointer px-3 text-xs"
            onClick={() => void handlePdf()}
            disabled={printLoading || loading}
          >
            Exporter PDF
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-7 cursor-pointer px-3 text-xs"
            onClick={handleCsv}
            disabled={loading}
          >
            Exporter Excel (CSV)
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-7 cursor-pointer px-3 text-xs"
            onClick={() => void handleSignaletic()}
            disabled={printLoading || loading || items.length === 0}
          >
            Fiches signalétiques
          </Button>
        </div>
      </div>

      {error || apiError || printError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error ?? apiError ?? printError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {[
          { label: 'Total', value: summary?.total ?? items.length },
          { label: 'Affectés', value: summary?.assigned ?? 0 },
          { label: 'En stock', value: summary?.inStock ?? 0 },
          { label: 'En panne', value: summary?.broken ?? 0 },
          { label: 'Réparation', value: summary?.inRepair ?? 0 },
          { label: 'Garanties expirées', value: summary?.warrantyExpired ?? 0 },
          { label: 'À renouveler', value: summary?.toRenew ?? 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="border border-gray-100 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {kpi.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {kpi.value.toLocaleString('fr-FR')}
            </p>
          </div>
        ))}
      </div>

      <Card title="Rapports prêts">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="default" className="h-7 cursor-pointer px-3 text-xs" onClick={resetFilters}>
            Parc complet
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-7 cursor-pointer px-3 text-xs"
            onClick={() => applyPresetTypes(['pc', 'bureau', 'desktop'])}
          >
            PC
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-7 cursor-pointer px-3 text-xs"
            onClick={() => applyPresetTypes(['laptop', 'portable', 'notebook'])}
          >
            Laptops
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-7 cursor-pointer px-3 text-xs"
            onClick={() => applyPresetTypes(['imprimante', 'printer'])}
          >
            Imprimantes
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-7 cursor-pointer px-3 text-xs"
            onClick={() => applyPresetTypes(['onduleur', 'ups'])}
          >
            Onduleurs
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-7 cursor-pointer px-3 text-xs"
            onClick={() => {
              setWarrantyExpired(true)
              setMinAgeYears(4)
            }}
          >
            À renouveler
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-7 cursor-pointer px-3 text-xs"
            onClick={() => setPhysicalPendingOnly(true)}
          >
            Non inventoriés
          </Button>
        </div>
      </Card>

      <Card title="Construire un rapport">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Types de matériel
            </p>
            <div className="flex flex-wrap gap-2">
              {materialTypes.map((t) => {
                const active = selectedTypeIds.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.id)}
                    className={`cursor-pointer border px-3 py-1 text-xs ${
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Select
              label="Direction"
              value={departmentId === '' ? '' : String(departmentId)}
              onChange={(e) =>
                setDepartmentId(e.target.value ? Number(e.target.value) : '')
              }
            >
              <option value="">Toutes</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Select
              label="Utilisateur"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Tous</option>
              {knownUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatUserName(u)}
                </option>
              ))}
            </Select>
            <Select
              label="État"
              value={status}
              onChange={(e) => setStatus(e.target.value as AssetStatus | '')}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Input
              label="Recherche"
              placeholder="Nom, inventaire, modèle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={warrantyExpired}
                onChange={(e) => setWarrantyExpired(e.target.checked)}
              />
              Garantie expirée
            </label>
            <label className="inline-flex items-center gap-2">
              Âge minimum (ans)
              <input
                type="number"
                min={1}
                className="w-20 border border-gray-200 px-2 py-1"
                value={minAgeYears}
                onChange={(e) =>
                  setMinAgeYears(e.target.value ? Number(e.target.value) : '')
                }
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={physicalPendingOnly}
                onChange={(e) => setPhysicalPendingOnly(e.target.checked)}
              />
              Non inventoriés physiquement
            </label>
            <Button type="button" className="h-7 cursor-pointer px-3 text-xs" onClick={() => void load()} disabled={loading}>
              Appliquer
            </Button>
            <Button type="button" variant="default" className="h-7 cursor-pointer px-3 text-xs" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Colonnes du rapport
            </p>
            <div className="flex flex-wrap gap-3">
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={columns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                  {col.optional ? <span className="text-gray-400">(opt.)</span> : null}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card
        title={`Parc filtré (${items.length})`}
        action={loading ? <BeatLoader size={8} color="var(--color-primary)" /> : null}
      >
        <Table columns={tableColumns}>
          {items.map((asset, index) => (
            <tr key={asset.id} className="hover:bg-gray-50">
              <td className="border-b border-slate-100 px-3 py-2 text-[13px]">{index + 1}</td>
              {columns.map((col) => (
                <td key={col} className="border-b border-slate-100 px-3 py-2 text-[13px]">
                  {col === 'status' ? (
                    <StatusBadge status={asset.status} />
                  ) : (
                    cellValue(asset, col)
                  )}
                </td>
              ))}
              <td className="border-b border-slate-100 px-3 py-2 text-[13px]">
                <Button
                  type="button"
                  variant="default"
                  className="h-7 cursor-pointer px-2 text-xs"
                  disabled={loading || Boolean(asset.lastPhysicalInventoryAt)}
                  onClick={() => void handleMarkInventoried(asset.id)}
                >
                  {asset.lastPhysicalInventoryAt
                    ? `Inventorié ${formatDate(asset.lastPhysicalInventoryAt)}`
                    : 'Marquer inventorié'}
                </Button>
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading ? (
            <tr>
              <td
                colSpan={tableColumns.length}
                className="px-3 py-8 text-center text-sm text-gray-500"
              >
                Aucun matériel pour ces filtres.
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}
