import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useAssignments } from '../api/hooks/useAssignments'
import { useImpression } from '../api/hooks/useImpression'
import { useScreenLoans } from '../api/hooks/useScreenLoans'
import { useSuppliers } from '../api/hooks/useSuppliers'
import { useMaterialTypes } from '../api/hooks/useMaterialTypes'
import { errorMessageFromUnknown } from '../lib/errors'
import { formatDate } from '../lib/format'
import type { Asset, AssetStatus, ScreenLoan } from '../types'
import type { Supplier } from '../api/services/suppliers.service'
import type { MaterialType } from '../api/services/material-types.service'
import { StatusBadge } from '../components/Badge'
import { DrawerAssets, type AssetCreateFormState } from '../components/drawers/DrawerAssets'
import { DrawerAssetsUpdate } from '../components/drawers/DrawerAssetsUpdate'
import { DrawerAssignments } from '../components/drawers/DrawerAssignments'
import { DrawerScreenLoan } from '../components/drawers/DrawerScreenLoan'
import { ConfirmModal } from '../components/Modal'
import { Button, Card, Input, PageTitle, Select, Table } from '../components/Ui'

const statusOptions: Array<{ value: AssetStatus | ''; label: string }> = [
  { value: '', label: 'Tous' },
  { value: 'EN_STOCK_NON_AFFECTE', label: 'Stock/Non affecté' },
  { value: 'AFFECTE', label: 'Affecté' },
  { value: 'EN_PRET', label: 'En prêt' },
  { value: 'EN_PANNE', label: 'En Panne' },
  { value: 'EN_REPARATION', label: 'Réparation' },
  { value: 'EN_SERVICE', label: 'En Service' },
  { value: 'HORS_SERVICE', label: 'Hors Service' },
]

/** Préfixe court (max 4 car.) dérivé du libellé du type de matériel. */
function materialTypePrefix(typeName: string): string {
  const t = typeName.trim()
  if (!t) return 'MAT'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return parts
      .slice(0, 4)
      .map((p) => {
        const c = p.charAt(0)
        const u = c
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .toUpperCase()
        return /^[A-Z0-9]$/u.test(u) ? u : 'X'
      })
      .join('')
  }
  const ascii = parts[0]
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  return (ascii.slice(0, 4) || 'MAT')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function serialNumberValue(asset: Asset): string {
  return (asset.serialNumber ?? asset.serial_number ?? '').trim()
}

/** Recherche locale (hors API) sur les champs affichés dans la liste. */
function assetMatchesQuery(a: Asset, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [a.inventoryNumber, serialNumberValue(a), a.type, a.brand, a.model, a.supplier]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

function warrantyLabel(asset: Asset): string {
  if (asset.warrantyEndDate) return `Jusqu'au ${formatDate(asset.warrantyEndDate)}`
  if (typeof asset.warrantyMonths === 'number') return `${asset.warrantyMonths} mois`
  return '—'
}

/** Prochain numéro du type `PC0002`, `PC00303` (préfixe + suite numérique). */
function nextSequentialInventoryNumber(materialType: string, assets: Asset[]): string {
  const prefix = materialTypePrefix(materialType)
  const re = new RegExp(`^${escapeRegex(prefix)}(\\d+)$`, 'i')
  let max = 0
  let maxWidth = 4
  for (const a of assets) {
    const m = a.inventoryNumber.match(re)
    if (m) {
      const digits = m[1]
      maxWidth = Math.max(maxWidth, digits.length)
      const n = parseInt(digits, 10)
      if (!Number.isNaN(n) && n > max) max = n
    }
  }
  const next = max + 1
  const padded = String(next).padStart(Math.max(maxWidth, String(next).length), '0')
  return `${prefix}${padded}`
}

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 9V4h12v5M6 18h12v2H6v-2zm12-3h1a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2h1m12 0H6v-4h12v4z"
      />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  )
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function TransferAssignIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
    </svg>
  )
}

function ScreenLoanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16v10H4V5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 19h8M12 15v4" />
    </svg>
  )
}

export function AssetsPage() {
  const [items, setItems] = useState<Asset[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState<AssetStatus | ''>('')

  const [allAssets, setAllAssets] = useState<Asset[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeScreenLoans, setActiveScreenLoans] = useState<ScreenLoan[]>([])
  const [screenLoanDrawerOpen, setScreenLoanDrawerOpen] = useState(false)
  const [screenLoanAssetId, setScreenLoanAssetId] = useState<number | ''>('')

  const [form, setForm] = useState<AssetCreateFormState>(() => ({
    inventoryNumber: nextSequentialInventoryNumber('PC', []),
    serialNumber: '',
    type: 'PC',
    brand: '',
    model: '',
    entryDate: new Date().toISOString().slice(0, 10),
    warrantyMonths: '',
    supplier: '',
  }))

  const [assetToDelete, setAssetToDelete] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [assignmentDrawerOpen, setAssignmentDrawerOpen] = useState(false)
  const [assignAssetId, setAssignAssetId] = useState<number | ''>('')
  const [assignDepartment, setAssignDepartment] = useState('')
  const [assignUsers, setAssignUsers] = useState<string[]>([''])
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [assetEditingId, setAssetEditingId] = useState<number | null>(null)
  const [updateForm, setUpdateForm] = useState<AssetCreateFormState>(() => ({
    inventoryNumber: '',
    serialNumber: '',
    type: '',
    brand: '',
    model: '',
    entryDate: new Date().toISOString().slice(0, 10),
    warrantyMonths: '',
    supplier: '',
  }))

  const { fetchAssets, createAsset, updateAsset, deleteAsset, loading, error: apiError } = useAssets()
  const { createAssignmentForAsset, loading: assignmentLoading, error: assignmentError } = useAssignments()
  const { downloadReport, loading: printLoading, error: printError } = useImpression()
  const {
    fetchScreenLoans,
    createScreenLoan,
    loading: screenLoanLoading,
    error: screenLoanError,
  } = useScreenLoans()
  const { fetchSuppliers } = useSuppliers()
  const { fetchMaterialTypes } = useMaterialTypes()

  const loadAllForSeq = useCallback(async () => {
    const assets = await fetchAssets({})
    setAllAssets(assets)
    return assets
  }, [fetchAssets])

  const loadActiveScreenLoans = useCallback(async () => {
    const loans = await fetchScreenLoans({ status: 'NOT_RETURNED' })
    setActiveScreenLoans(loans ?? [])
    return loans
  }, [fetchScreenLoans])

  const types = useMemo(() => {
    const s = new Set(items.map((a) => a.type).filter(Boolean))
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [items])

  const assignable = useMemo(() => {
    return allAssets
      .filter((a) => a.status === 'EN_STOCK_NON_AFFECTE')
      .slice()
      .sort((a, b) => a.inventoryNumber.localeCompare(b.inventoryNumber, 'fr', { numeric: true }))
      .map((a) => ({
        id: a.id,
        inventoryNumber: a.inventoryNumber,
        type: a.type,
        brand: a.brand,
        model: a.model,
      }))
  }, [allAssets])

  const loanableAssets = useMemo(() => {
    return allAssets
      .filter((a) => a.status === 'EN_STOCK_NON_AFFECTE' || a.status === 'EN_PRET')
      .slice()
      .sort((a, b) => a.inventoryNumber.localeCompare(b.inventoryNumber, 'fr', { numeric: true }))
  }, [allAssets])

  const activeLoanAssetIds = useMemo(
    () => new Set(activeScreenLoans.filter((loan) => !loan.returnedAt).map((loan) => loan.assetId)),
    [activeScreenLoans],
  )

  const filteredItems = useMemo(() => items.filter((a) => assetMatchesQuery(a, q)), [items, q])

  function load() {
    setError(null)
    fetchAssets({ type, status })
      .then(setItems)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement.')
      })
  }

  useEffect(() => {
    load()
    loadAllForSeq().catch((e) => {
      const msg = String(e?.message ?? e)
      toast.error(msg || 'Erreur lors du chargement des matériels (séquence inventaire).')
    })
    loadActiveScreenLoans().catch((e) => {
      const msg = String(e?.message ?? e)
      toast.error(msg || 'Erreur lors du chargement des emprunts de matériel.')
    })
    fetchSuppliers()
      .then(setSuppliers)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des fournisseurs.')
      })
    fetchMaterialTypes()
      .then(setMaterialTypes)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des types de matériel.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setForm((f) => ({
      ...f,
      inventoryNumber: nextSequentialInventoryNumber(f.type, allAssets),
    }))
  }, [allAssets])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedForm: AssetCreateFormState = {
      ...form,
      serialNumber: form.serialNumber.trim(),
      type: form.type.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      warrantyMonths: form.warrantyMonths.trim(),
      supplier: form.supplier.trim(),
    }

    if (!trimmedForm.inventoryNumber) {
      toast.warning("Le numéro d'inventaire est manquant.")
      return
    }
    if (!trimmedForm.type) {
      toast.warning('Veuillez sélectionner un type de matériel.')
      return
    }
    if (!trimmedForm.brand) {
      toast.warning('Veuillez saisir la marque du matériel.')
      return
    }
    if (!trimmedForm.model) {
      toast.warning('Veuillez saisir le modèle du matériel.')
      return
    }
    if (!trimmedForm.entryDate) {
      toast.warning("Veuillez saisir la date d'entrée.")
      return
    }
    if (!trimmedForm.supplier) {
      toast.warning('Veuillez sélectionner un fournisseur.')
      return
    }

    try {
      const parsedWarrantyMonths = Number(trimmedForm.warrantyMonths)
      await createAsset({
        ...trimmedForm,
        serialNumber: trimmedForm.serialNumber || undefined,
        warrantyMonths:
          Number.isFinite(parsedWarrantyMonths) && parsedWarrantyMonths > 0 ? parsedWarrantyMonths : undefined,
      })
      toast.success('Matériel ajouté avec succès.')
      const fresh = await loadAllForSeq()
      setForm((f) => ({
        ...f,
        inventoryNumber: nextSequentialInventoryNumber(f.type, fresh),
        serialNumber: '',
        brand: '',
        model: '',
        warrantyMonths: '',
        supplier: '',
      }))
      setDrawerOpen(false)
      load()
    } catch (err: unknown) {
      const msg = errorMessageFromUnknown(err, "Erreur lors de l'ajout du matériel.")
      setError(msg)
      toast.error(msg || "Erreur lors de l'ajout du matériel.")
    }
  }

  function openEdit(a: Asset) {
    setUpdateForm({
      inventoryNumber: a.inventoryNumber,
      serialNumber: serialNumberValue(a),
      type: a.type,
      brand: a.brand,
      model: a.model,
      entryDate: a.entryDate.length >= 10 ? a.entryDate.slice(0, 10) : a.entryDate,
      warrantyMonths: typeof a.warrantyMonths === 'number' ? String(a.warrantyMonths) : '',
      supplier: a.supplier,
    })
    setAssetEditingId(a.id)
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (assetEditingId == null) return
    setError(null)

    const trimmed: AssetCreateFormState = {
      ...updateForm,
      inventoryNumber: updateForm.inventoryNumber.trim(),
      serialNumber: updateForm.serialNumber.trim(),
      type: updateForm.type.trim(),
      brand: updateForm.brand.trim(),
      model: updateForm.model.trim(),
      warrantyMonths: updateForm.warrantyMonths.trim(),
      supplier: updateForm.supplier.trim(),
    }

    if (!trimmed.inventoryNumber) {
      toast.warning("Le numéro d'inventaire est manquant.")
      return
    }
    if (!trimmed.type) {
      toast.warning('Veuillez sélectionner un type de matériel.')
      return
    }
    if (!trimmed.brand) {
      toast.warning('Veuillez saisir la marque du matériel.')
      return
    }
    if (!trimmed.model) {
      toast.warning('Veuillez saisir le modèle du matériel.')
      return
    }
    if (!trimmed.entryDate) {
      toast.warning("Veuillez saisir la date d'entrée.")
      return
    }
    if (!trimmed.supplier) {
      toast.warning('Veuillez sélectionner un fournisseur.')
      return
    }

    try {
      const parsedWarrantyMonths = Number(trimmed.warrantyMonths)
      await updateAsset(assetEditingId, {
        ...trimmed,
        serialNumber: trimmed.serialNumber || undefined,
        warrantyMonths:
          Number.isFinite(parsedWarrantyMonths) && parsedWarrantyMonths > 0 ? parsedWarrantyMonths : undefined,
      })
      toast.success('Matériel mis à jour.')
      const fresh = await loadAllForSeq()
      setForm((f) => ({
        ...f,
        inventoryNumber: nextSequentialInventoryNumber(f.type, fresh),
      }))
      setAssetEditingId(null)
      load()
    } catch (err: unknown) {
      const msg = errorMessageFromUnknown(err, 'Erreur lors de la mise à jour du matériel.')
      setError(msg)
      toast.error(msg || 'Erreur lors de la mise à jour du matériel.')
    }
  }

  function openAssignmentDrawerForAsset(assetId: number) {
    setAssignAssetId(assetId)
    setAssignDepartment('')
    setAssignUsers([''])
    setAssignStartDate(new Date().toISOString().slice(0, 10))
    setAssignmentDrawerOpen(true)
  }

  function openScreenLoanDrawerForAsset(assetId: number) {
    setScreenLoanAssetId(assetId)
    setScreenLoanDrawerOpen(true)
  }

  async function handleScreenLoanSuccess() {
    await Promise.all([loadAllForSeq(), loadActiveScreenLoans()])
    load()
  }

  async function onCreateAssignment(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!assignAssetId) {
      toast.warning('Veuillez sélectionner un matériel.')
      return
    }
    try {
      const names = assignUsers.map((u) => u.trim()).filter(Boolean)
      if (!names.length) {
        toast.warning('Veuillez saisir au moins un utilisateur.')
        return
      }
      await createAssignmentForAsset(Number(assignAssetId), {
        department: assignDepartment,
        user: names.length === 1 ? { name: names[0] } : { names },
        startDate: assignStartDate,
      })
      toast.success('Affectation créée avec succès.')
      setAssignAssetId('')
      setAssignDepartment('')
      setAssignUsers([''])
      setAssignStartDate(new Date().toISOString().slice(0, 10))
      setAssignmentDrawerOpen(false)
      await loadAllForSeq()
      load()
    } catch (err: unknown) {
      const msg = errorMessageFromUnknown(err, "Erreur lors de l'affectation.")
      setError(msg)
      toast.error(msg || "Erreur lors de l'affectation.")
    }
  }

  async function confirmDelete() {
    if (assetToDelete == null) return
    setError(null)
    setDeleteLoading(true)
    try {
      await deleteAsset(assetToDelete)
      toast.success('Matériel supprimé.')
      setAssetToDelete(null)
      await loadAllForSeq()
      load()
    } catch (err: unknown) {
      const msg = String((err as Error)?.message ?? err)
      setError(msg)
      toast.error(msg || 'Erreur lors de la suppression.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const assetLabel =
    assetToDelete != null
      ? items.find((a) => a.id === assetToDelete)?.inventoryNumber ?? 'ce matériel'
      : ''

  const handlePrint = async () => {
    try {
      await downloadReport('assets')
      toast.success('Rapport PDF téléchargé.')
    } catch {
      toast.error("Erreur lors de l'impression du rapport.")
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={assetToDelete != null}
        onClose={() => setAssetToDelete(null)}
        onConfirm={confirmDelete}
        title="Supprimer le matériel"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        loading={deleteLoading}
      >
        Êtes-vous sûr de vouloir supprimer <strong>{assetLabel}</strong> ? Cette action est irréversible.
      </ConfirmModal>
      <div className="flex items-center justify-between">
        <PageTitle>Gestion de Stock</PageTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={() => setDrawerOpen(true)}
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            disabled={loading}
          >
            Ajouter un matériel
          </Button>
          <Button
            type="button"
            onClick={() => {
              setScreenLoanAssetId('')
              setScreenLoanDrawerOpen(true)
            }}
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            disabled={loading || screenLoanLoading}
          >
            Emprunter un matériel
          </Button>
          <Button
            onClick={() => {
              load()
              loadAllForSeq().catch((e) => {
                const msg = String(e?.message ?? e)
                toast.error(msg || 'Erreur lors du chargement.')
              })
              loadActiveScreenLoans().catch((e) => {
                const msg = String(e?.message ?? e)
                toast.error(msg || 'Erreur lors du chargement.')
              })
            }}
            disabled={loading}
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
          >
            Actualiser
          </Button>
        </div>
      </div>

      {error || apiError || printError || assignmentError || screenLoanError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? apiError ?? printError ?? assignmentError ?? screenLoanError}
        </div>
      ) : null}

      <DrawerAssets
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        form={form}
        setForm={setForm}
        materialTypes={materialTypes}
        suppliers={suppliers}
        loading={loading}
        onSubmit={onCreate}
        nextInventoryForType={(materialType) => nextSequentialInventoryNumber(materialType, allAssets)}
      />

      <DrawerAssetsUpdate
        isOpen={assetEditingId != null}
        onClose={() => setAssetEditingId(null)}
        form={updateForm}
        setForm={setUpdateForm}
        materialTypes={materialTypes}
        suppliers={suppliers}
        loading={loading}
        onSubmit={onUpdate}
      />

      <DrawerAssignments
        isOpen={assignmentDrawerOpen}
        onClose={() => setAssignmentDrawerOpen(false)}
        assignable={assignable}
        assetId={assignAssetId}
        setAssetId={setAssignAssetId}
        department={assignDepartment}
        setDepartment={setAssignDepartment}
        users={assignUsers}
        setUsers={setAssignUsers}
        startDate={assignStartDate}
        setStartDate={setAssignStartDate}
        loading={loading || assignmentLoading}
        onSubmit={onCreateAssignment}
      />

      <DrawerScreenLoan
        isOpen={screenLoanDrawerOpen}
        onClose={() => {
          setScreenLoanDrawerOpen(false)
          setScreenLoanAssetId('')
        }}
        onSuccess={handleScreenLoanSuccess}
        assets={loanableAssets}
        activeLoanAssetIds={activeLoanAssetIds}
        createScreenLoan={createScreenLoan}
        initialAssetId={screenLoanAssetId}
      />

      <Card title="Liste du matériel">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input
            label="Recherche"
            placeholder="Inventaire, n° série, type, marque, modèle, fournisseur…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tous</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            label="État"
            value={status}
            onChange={(e) => setStatus(e.target.value as AssetStatus | '')}
          >
            {statusOptions.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <div className="flex items-end gap-2">
            <Button
              onClick={handlePrint}
              className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
              title="Imprimer"
              disabled={printLoading}
            >
              <PrintIcon className="h-5 w-5" />
            </Button>
            <Button onClick={load} className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" disabled={loading}>
              Filtrer
            </Button>
            <Button
              onClick={() => {
                setQ('')
                setType('')
                setStatus('')
                setTimeout(load, 0)
              }}
              disabled={loading}
              className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            >
              Réinitialiser
            </Button>
          </div>
        </div>

        <Table
          columns={[
            'Inventaire',
            'N° série',
            'Type',
            'Marque',
            'Modèle',
            'Entrée',
            'Garantie',
            'Fournisseur',
            'État',
            'Actions',
          ]}
        >
          {filteredItems.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900 text-[13px]">
                {a.inventoryNumber}
              </td>
              <td className="px-4 py-3 text-gray-600 text-[13px]">{serialNumberValue(a) || '—'}</td>
              <td className="px-4 py-3 text-gray-600">{a.type}</td>
              <td className="px-4 py-3 text-gray-600">{a.brand}</td>
              <td className="px-4 py-3 text-gray-600">{a.model}</td>
              <td className="px-4 py-3 text-gray-600">{formatDate(a.entryDate)}</td>
              <td className="px-4 py-3 text-gray-600 text-[13px]">{warrantyLabel(a)}</td>
              <td className="px-4 py-3 text-gray-600">{a.supplier}</td>
              <td className="px-4 py-3 text-gray-600">
                {a.status === 'EN_STOCK_NON_AFFECTE' ? (
                  <span
                    className="inline-flex items-center rounded-full  px-2 py-0.5 text-xs font-medium text-[#64748b]"
                    style={{ backgroundColor: '#f3f3f3' }}
                  >
                    En stock/non affecté
                  </span>
                ) : (
                  <StatusBadge status={a.status} />
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Link
                    to={`/assets/${a.id}`}
                    className={`inline-flex items-center justify-center rounded p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${loading ? 'pointer-events-none opacity-50' : ''}`}
                    title="Historique / Aperçu"
                    aria-label="Voir l'historique"
                  >
                    <HistoryIcon className="h-3 w-3" />
                  </Link>
                  <button
                    type="button"
                    className={`inline-flex items-center cursor-pointer justify-center rounded p-1.5 text-gray-600 hover:bg-amber-50 hover:text-amber-800 ${loading ? 'pointer-events-none opacity-50' : ''}`}
                    title="Modifier"
                    aria-label="Modifier le matériel"
                    onClick={() => !loading && openEdit(a)}
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center rounded p-1.5 ${
                      a.status === 'EN_STOCK_NON_AFFECTE' && !loading
                        ? 'cursor-pointer text-gray-600 hover:bg-sky-50 hover:text-sky-800'
                        : 'cursor-not-allowed text-gray-300'
                    } ${loading ? 'pointer-events-none opacity-50' : ''}`}
                    title={
                      a.status === 'EN_STOCK_NON_AFFECTE'
                        ? 'Transférer / affecter vers une direction'
                        : 'Réservé au matériel en stock non affecté'
                    }
                    aria-label="Transférer ou affecter le matériel"
                    disabled={a.status !== 'EN_STOCK_NON_AFFECTE' || loading}
                    onClick={() =>
                      !loading && a.status === 'EN_STOCK_NON_AFFECTE' && openAssignmentDrawerForAsset(a.id)
                    }
                  >
                    <TransferAssignIcon className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center rounded p-1.5 ${
                      a.status === 'EN_STOCK_NON_AFFECTE' &&
                      !activeLoanAssetIds.has(a.id) &&
                      !loading &&
                      !screenLoanLoading
                        ? 'cursor-pointer text-gray-600 hover:bg-sky-50 hover:text-sky-800'
                        : 'cursor-not-allowed text-gray-300'
                    } ${loading || screenLoanLoading ? 'pointer-events-none opacity-50' : ''}`}
                    title={
                      activeLoanAssetIds.has(a.id) || a.status === 'EN_PRET'
                        ? 'Ce matériel est déjà en prêt'
                        : a.status === 'EN_STOCK_NON_AFFECTE'
                          ? 'Enregistrer un emprunt de matériel'
                          : 'Réservé au matériel en stock non affecté'
                    }
                    aria-label="Enregistrer un emprunt de matériel"
                    disabled={
                      a.status !== 'EN_STOCK_NON_AFFECTE' ||
                      activeLoanAssetIds.has(a.id) ||
                      loading ||
                      screenLoanLoading
                    }
                    onClick={() => {
                      if (
                        !loading &&
                        !screenLoanLoading &&
                        a.status === 'EN_STOCK_NON_AFFECTE' &&
                        !activeLoanAssetIds.has(a.id)
                      ) {
                        openScreenLoanDrawerForAsset(a.id)
                      }
                    }}
                  >
                    <ScreenLoanIcon className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center cursor-pointer justify-center rounded p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600 ${loading ? 'pointer-events-none opacity-50' : ''}`}
                    title="Supprimer"
                    aria-label="Supprimer le matériel"
                    onClick={() => !loading && setAssetToDelete(a.id)}
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!filteredItems.length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={10}>
                {loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : items.length ? (
                  'Aucun matériel ne correspond à la recherche.'
                ) : (
                  'Aucun matériel.'
                )}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}
