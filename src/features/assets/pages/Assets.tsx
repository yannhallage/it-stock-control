import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useAssets } from '../hooks/useAssets'
import { useAssignments } from '@features/assignments'
import { useBrands } from '@features/referentiels/brands'
import { useCategories } from '@features/referentiels/categories'
import { useDepartments } from '@features/referentiels/departments'
import { useEmployees } from '@features/referentiels/employees'
import { useImpression } from '@core/impression/useImpression'
import { useLocations } from '@features/referentiels/locations'
import { useScreenLoans } from '@features/screen-loans'
import { useSuppliers } from '@features/referentiels/suppliers'
import { useMaterialTypes } from '@features/referentiels/material-types'
import type { Brand } from '@features/referentiels/brands'
import type { Category } from '@features/referentiels/categories'
import type { Employee } from '@features/referentiels/employees'
import type { Location } from '@features/referentiels/locations'
import {
  formatEmployeeName,
  getBrandName,
  getDepartmentName,
  getSerialNumber,
  getSupplierName,
  getTypeName,
} from '@shared/utils/asset-labels'
import { errorMessageFromUnknown } from '@shared/utils/errors'
import { formatDate } from '@shared/utils/format'
import type { Asset, AssetDetailsApi, AssetStatus, ScreenLoan } from '@core/models'
import type { Supplier } from '@features/referentiels/suppliers'
import type { MaterialType } from '@features/referentiels/material-types'
import { StatusBadge } from '@shared/ui'
import { CalendarFilterModal, type CalendarFilterValue } from '@shared/ui'
import { AssetActionsMenu } from '../components/AssetActionsMenu'
import { CalendarIcon, PrintIcon } from '../components/AssetIcons'
import { AssetPreviewModal } from '../components/AssetPreviewModal'
import { DrawerAssets, type AssetCreateFormState } from '../components/DrawerAssets'
import { DrawerAssetsUpdate } from '../components/DrawerAssetsUpdate'
import { DrawerAssignments } from '@features/assignments'
import { DrawerScreenLoan } from '@features/screen-loans'
import { ReportIncidentDrawer } from '@features/incidents'
import { ConfirmModal } from '@shared/ui'
import { Button, Card, Input, PageTitle, Select, Table } from '@shared/ui'
import {
  assetDateRangeLabel,
  assetDateRangePrintFilters,
  assetMatchesDateRange,
  assetMatchesQuery,
  emptyAssetForm,
  nextInventoryForMaterialTypeId,
  selectedAssetDateRange,
  statusOptions,
  warrantyEndDateFromMonths,
  warrantyLabel,
  warrantyMonthsFromAsset,
} from '../utils/asset-list'

export function AssetsPage() {
  const [items, setItems] = useState<Asset[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [materialTypeId, setMaterialTypeId] = useState<number | ''>('')
  const [status, setStatus] = useState<AssetStatus | ''>('')
  const [filterDepartmentId, setFilterDepartmentId] = useState<number | ''>('')
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [entryDateRange, setEntryDateRange] = useState<CalendarFilterValue>(null)

  const [allAssets, setAllAssets] = useState<Asset[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeScreenLoans, setActiveScreenLoans] = useState<ScreenLoan[]>([])
  const [screenLoanDrawerOpen, setScreenLoanDrawerOpen] = useState(false)
  const [screenLoanAssetId, setScreenLoanAssetId] = useState<number | ''>('')
  const [incidentDrawerOpen, setIncidentDrawerOpen] = useState(false)
  const [incidentAssetId, setIncidentAssetId] = useState<number | ''>('')

  const [form, setForm] = useState<AssetCreateFormState>(() => emptyAssetForm())

  const [assetToDelete, setAssetToDelete] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewAsset, setPreviewAsset] = useState<AssetDetailsApi | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [assignmentDrawerOpen, setAssignmentDrawerOpen] = useState(false)
  const [assignAssetId, setAssignAssetId] = useState<number | ''>('')
  const [assignDepartmentId, setAssignDepartmentId] = useState<number | ''>('')
  const [assignEmployeeId, setAssignEmployeeId] = useState('')
  const [assignCustomEmployeeId, setAssignCustomEmployeeId] = useState('')
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  const [assetEditingId, setAssetEditingId] = useState<number | null>(null)
  const [updateForm, setUpdateForm] = useState<AssetCreateFormState>(() => emptyAssetForm())

  const { fetchAssets, getAssetById, createAsset, updateAsset, deleteAsset, loading, error: apiError } = useAssets()
  const { createAssignmentForAsset, loading: assignmentLoading, error: assignmentError } = useAssignments()
  const { downloadReport, downloadAssetReport, loading: printLoading, error: printError } = useImpression()
  const {
    fetchScreenLoans,
    createScreenLoan,
    loading: screenLoanLoading,
    error: screenLoanError,
  } = useScreenLoans()
  const { fetchSuppliers } = useSuppliers()
  const { fetchMaterialTypes } = useMaterialTypes()
  const { fetchCategories } = useCategories()
  const { fetchBrands } = useBrands()
  const { fetchLocations } = useLocations()
  const { fetchDepartments } = useDepartments()
  const { fetchEmployees } = useEmployees()

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

  const assignable = useMemo(() => {
    return allAssets
      .filter((a) => a.status === 'EN_STOCK_NON_AFFECTE')
      .slice()
      .sort((a, b) => a.inventoryNumber.localeCompare(b.inventoryNumber, 'fr', { numeric: true }))
      .map((a) => ({
        id: a.id,
        inventoryNumber: a.inventoryNumber,
        model: a.model,
        materialType: a.materialType,
        brand: a.brand,
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

  const filteredItems = useMemo(
    () => items.filter((a) => assetMatchesQuery(a, q) && assetMatchesDateRange(a, entryDateRange)),
    [entryDateRange, items, q],
  )
  const entryDateRangeText = useMemo(() => assetDateRangeLabel(entryDateRange), [entryDateRange])
  const hasEntryDateRange = selectedAssetDateRange(entryDateRange) != null

  function load() {
    setError(null)
    fetchAssets({
      materialTypeId: materialTypeId === '' ? undefined : materialTypeId,
      departmentId: filterDepartmentId === '' ? undefined : filterDepartmentId,
      status,
    })
      .then(setItems)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement.')
      })
  }

  const loadReferenceData = useCallback(async () => {
    const [cats, brs, locs, sups, types] = await Promise.all([
      fetchCategories(),
      fetchBrands(),
      fetchLocations(),
      fetchSuppliers(),
      fetchMaterialTypes(),
    ])
    setCategories(cats ?? [])
    setBrands(brs ?? [])
    setLocations(locs ?? [])
    setSuppliers(sups ?? [])
    setMaterialTypes(types ?? [])
    return { cats, brs, locs, sups, types }
  }, [fetchBrands, fetchCategories, fetchLocations, fetchMaterialTypes, fetchSuppliers])

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
    loadReferenceData().catch((e) => {
      const msg = String(e?.message ?? e)
      toast.error(msg || 'Erreur lors du chargement des données de référence.')
    })
    fetchDepartments()
      .then((depts) => setDepartments(depts ?? []))
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!drawerOpen && assetEditingId == null) return
    loadReferenceData().catch((e) => {
      const msg = String(e?.message ?? e)
      toast.error(msg || 'Erreur lors du chargement des données de référence.')
    })
  }, [assetEditingId, drawerOpen, loadReferenceData])

  useEffect(() => {
    if (!assignmentDrawerOpen) return
    Promise.all([fetchDepartments(), fetchEmployees()])
      .then(([depts, emps]) => {
        setDepartments(depts ?? [])
        setEmployees(emps ?? [])
      })
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des affectations.')
      })
  }, [assignmentDrawerOpen, fetchDepartments, fetchEmployees])

  useEffect(() => {
    if (typeof form.materialTypeId !== 'number') return
    setForm((f) => ({
      ...f,
      inventoryNumber: nextInventoryForMaterialTypeId(f.materialTypeId as number, materialTypes, allAssets),
    }))
  }, [allAssets, form.materialTypeId, materialTypes])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedForm = {
      ...form,
      serialNumber: form.serialNumber.trim(),
      model: form.model.trim(),
      warrantyMonths: form.warrantyMonths.trim(),
    }

    if (!trimmedForm.inventoryNumber) {
      toast.warning("Le numéro d'inventaire est manquant.")
      return
    }
    if (!trimmedForm.categoryId) {
      toast.warning('Veuillez sélectionner une catégorie.')
      return
    }
    if (!trimmedForm.materialTypeId) {
      toast.warning('Veuillez sélectionner un type de matériel.')
      return
    }
    if (!trimmedForm.brandId) {
      toast.warning('Veuillez sélectionner une marque.')
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
    if (!trimmedForm.supplierId) {
      toast.warning('Veuillez sélectionner un fournisseur.')
      return
    }

    try {
      const warrantyEndDate = warrantyEndDateFromMonths(trimmedForm.entryDate, trimmedForm.warrantyMonths)
      await createAsset({
        inventoryNumber: trimmedForm.inventoryNumber,
        serialNumber: trimmedForm.serialNumber || undefined,
        categoryId: Number(trimmedForm.categoryId),
        materialTypeId: Number(trimmedForm.materialTypeId),
        brandId: Number(trimmedForm.brandId),
        supplierId: Number(trimmedForm.supplierId),
        locationId: trimmedForm.locationId ? Number(trimmedForm.locationId) : undefined,
        model: trimmedForm.model,
        entryDate: trimmedForm.entryDate,
        warrantyStartDate: trimmedForm.warrantyMonths ? trimmedForm.entryDate : undefined,
        warrantyEndDate,
      })
      toast.success('Matériel ajouté avec succès.')
      const fresh = await loadAllForSeq()
      const { types } = await loadReferenceData()
      const defaultTypeId = typeof form.materialTypeId === 'number' ? form.materialTypeId : types?.[0]?.id
      setForm({
        ...emptyAssetForm(
          typeof defaultTypeId === 'number'
            ? nextInventoryForMaterialTypeId(defaultTypeId, types ?? materialTypes, fresh)
            : '',
        ),
        materialTypeId: defaultTypeId ?? '',
      })
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
      serialNumber: getSerialNumber(a) === '�' ? '' : getSerialNumber(a),
      categoryId: a.categoryId,
      materialTypeId: a.materialTypeId,
      brandId: a.brandId,
      supplierId: a.supplierId ?? '',
      locationId: a.locationId ?? '',
      model: a.model,
      entryDate: a.entryDate.length >= 10 ? a.entryDate.slice(0, 10) : a.entryDate,
      warrantyMonths: warrantyMonthsFromAsset(a),
    })
    setAssetEditingId(a.id)
  }

  async function openPreview(assetId: number) {
    setPreviewOpen(true)
    setPreviewAsset(null)
    setPreviewError(null)
    setPreviewLoading(true)
    try {
      const details = await getAssetById(assetId)
      setPreviewAsset(details)
    } catch (err: unknown) {
      const msg = errorMessageFromUnknown(err, 'Erreur lors du chargement du détail du matériel.')
      setPreviewError(msg)
      toast.error(msg || 'Erreur lors du chargement du détail du matériel.')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (assetEditingId == null) return
    setError(null)

    const trimmed = {
      ...updateForm,
      inventoryNumber: updateForm.inventoryNumber.trim(),
      serialNumber: updateForm.serialNumber.trim(),
      model: updateForm.model.trim(),
      warrantyMonths: updateForm.warrantyMonths.trim(),
    }

    if (!trimmed.inventoryNumber) {
      toast.warning("Le numéro d'inventaire est manquant.")
      return
    }
    if (!trimmed.categoryId) {
      toast.warning('Veuillez sélectionner une catégorie.')
      return
    }
    if (!trimmed.materialTypeId) {
      toast.warning('Veuillez sélectionner un type de matériel.')
      return
    }
    if (!trimmed.brandId) {
      toast.warning('Veuillez sélectionner une marque.')
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
    if (!trimmed.supplierId) {
      toast.warning('Veuillez sélectionner un fournisseur.')
      return
    }

    try {
      const warrantyEndDate = warrantyEndDateFromMonths(trimmed.entryDate, trimmed.warrantyMonths)
      await updateAsset(assetEditingId, {
        inventoryNumber: trimmed.inventoryNumber,
        serialNumber: trimmed.serialNumber || undefined,
        categoryId: Number(trimmed.categoryId),
        materialTypeId: Number(trimmed.materialTypeId),
        brandId: Number(trimmed.brandId),
        supplierId: Number(trimmed.supplierId),
        locationId: trimmed.locationId ? Number(trimmed.locationId) : undefined,
        model: trimmed.model,
        entryDate: trimmed.entryDate,
        warrantyStartDate: trimmed.warrantyMonths ? trimmed.entryDate : undefined,
        warrantyEndDate,
      })
      toast.success('Matériel mis à jour.')
      await loadAllForSeq()
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
    setAssignDepartmentId('')
    setAssignEmployeeId('')
    setAssignCustomEmployeeId('')
    setAssignStartDate(new Date().toISOString().slice(0, 10))
    setAssignmentDrawerOpen(true)
  }

  function openScreenLoanDrawerForAsset(assetId: number) {
    setScreenLoanAssetId(assetId)
    setScreenLoanDrawerOpen(true)
  }

  function openIncidentDrawerForAsset(assetId: number) {
    setIncidentAssetId(assetId)
    setIncidentDrawerOpen(true)
  }

  async function handleIncidentCreated() {
    await loadAllForSeq()
    load()
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
    const resolvedEmployeeId = assignEmployeeId.trim() || assignCustomEmployeeId.trim()
    if (!resolvedEmployeeId) {
      toast.warning('Veuillez sélectionner ou saisir un employé.')
      return
    }
    if (!assignDepartmentId) {
      toast.warning('Veuillez sélectionner une direction.')
      return
    }
    try {
      await createAssignmentForAsset(Number(assignAssetId), {
        employeeId: resolvedEmployeeId,
        departmentId: Number(assignDepartmentId),
        startDate: assignStartDate,
      })
      toast.success('Affectation créée avec succès.')
      setAssignAssetId('')
      setAssignDepartmentId('')
      setAssignEmployeeId('')
      setAssignCustomEmployeeId('')
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
      await downloadReport('assets', {
        search: q,
        materialTypeId: materialTypeId === '' ? undefined : materialTypeId,
        status,
        ...assetDateRangePrintFilters(entryDateRange),
      })
      toast.success('Rapport PDF téléchargé.')
    } catch {
      toast.error("Erreur lors de l'impression du rapport.")
    }
  }

  const handlePrintAsset = async (inventoryNumber: string) => {
    try {
      await downloadAssetReport(inventoryNumber)
      toast.success('Fiche materiel telechargee.')
    } catch {
      toast.error("Erreur lors de l'impression du materiel.")
    }
  }

  return (
    <div className="min-w-0 space-y-6">
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
        �`tes-vous sûr de vouloir supprimer <strong>{assetLabel}</strong> ? Cette action est irréversible.
      </ConfirmModal>
      <AssetPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        asset={previewAsset}
        loading={previewLoading}
        error={previewError}
      />
      <CalendarFilterModal
        open={dateFilterOpen}
        title="Filtrer par date d'entree"
        value={entryDateRange}
        onClose={() => setDateFilterOpen(false)}
        onApply={(value) => {
          setEntryDateRange(value)
          setDateFilterOpen(false)
        }}
        onClear={() => {
          setEntryDateRange(null)
          setDateFilterOpen(false)
        }}
      />
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PageTitle>Gestion de Stock</PageTitle>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
        categories={categories}
        materialTypes={materialTypes}
        brands={brands}
        suppliers={suppliers}
        locations={locations}
        loading={loading}
        onSubmit={onCreate}
        nextInventoryForMaterialTypeId={(id) => nextInventoryForMaterialTypeId(id, materialTypes, allAssets)}
      />

      <DrawerAssetsUpdate
        isOpen={assetEditingId != null}
        onClose={() => setAssetEditingId(null)}
        form={updateForm}
        setForm={setUpdateForm}
        categories={categories}
        materialTypes={materialTypes}
        brands={brands}
        suppliers={suppliers}
        locations={locations}
        loading={loading}
        onSubmit={onUpdate}
      />

      <DrawerAssignments
        isOpen={assignmentDrawerOpen}
        onClose={() => setAssignmentDrawerOpen(false)}
        assignable={assignable}
        departments={departments}
        employees={employees}
        assetId={assignAssetId}
        setAssetId={setAssignAssetId}
        departmentId={assignDepartmentId}
        setDepartmentId={setAssignDepartmentId}
        employeeId={assignEmployeeId}
        setEmployeeId={setAssignEmployeeId}
        customEmployeeId={assignCustomEmployeeId}
        setCustomEmployeeId={setAssignCustomEmployeeId}
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

      <ReportIncidentDrawer
        isOpen={incidentDrawerOpen}
        onClose={() => {
          setIncidentDrawerOpen(false)
          setIncidentAssetId('')
        }}
        assets={allAssets}
        onCreated={handleIncidentCreated}
        initialAssetId={incidentAssetId}
      />

      <Card title="Liste du matériel">
        <div className="mb-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Input
            label="Recherche"
            placeholder="Inventaire, n° série, type, marque, modèle, fournisseur⬦"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select
            label="Type"
            value={materialTypeId}
            onChange={(e) => setMaterialTypeId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Tous</option>
            {materialTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Select
            label="Direction"
            value={filterDepartmentId === '' ? '' : String(filterDepartmentId)}
            onChange={(e) => setFilterDepartmentId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Toutes</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            label="�0tat"
            value={status}
            onChange={(e) => setStatus(e.target.value as AssetStatus | '')}
          >
            {statusOptions.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-1">
            <Button
              onClick={handlePrint}
              className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
              title="Imprimer les resultats filtres"
              disabled={printLoading}
            >
              <PrintIcon className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant={hasEntryDateRange ? 'primary' : 'default'}
              onClick={() => setDateFilterOpen(true)}
              className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
              title={`Date d'entree: ${entryDateRangeText}`}
              aria-label="Filtrer par date d'entree"
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">{hasEntryDateRange ? entryDateRangeText : 'Date'}</span>
            </Button>
            <Button onClick={load} className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" disabled={loading}>
              Filtrer
            </Button>
            <Button
              onClick={() => {
                setQ('')
                setMaterialTypeId('')
                setFilterDepartmentId('')
                setStatus('')
                setEntryDateRange(null)
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
            'Utilisateur',
            'Direction',
            'Entrée',
            'Garantie',
            'Fournisseur',
            '�0tat',
            'Actions',
          ]}
        >
          {filteredItems.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900 text-[13px]">
                {a.inventoryNumber}
              </td>
              <td className="px-4 py-3 text-gray-600 text-[13px]">{getSerialNumber(a)}</td>
              <td className="px-4 py-3 text-gray-600">{getTypeName(a)}</td>
              <td className="px-4 py-3 text-gray-600">{getBrandName(a)}</td>
              <td className="px-4 py-3 text-gray-600">{a.model}</td>
              <td className="px-4 py-3 text-gray-600 text-[13px]">
                {a.currentAssignment ? formatEmployeeName(a.currentAssignment.employee) : '�'}
              </td>
              <td className="px-4 py-3 text-gray-600 text-[13px]">
                {a.currentAssignment ? getDepartmentName(a.currentAssignment) : '�'}
              </td>
              <td className="px-4 py-3 text-gray-600">{formatDate(a.entryDate)}</td>
              <td className="px-4 py-3 text-gray-600 text-[13px]">{warrantyLabel(a)}</td>
              <td className="px-4 py-3 text-gray-600">{getSupplierName(a)}</td>
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
                <AssetActionsMenu
                  asset={a}
                  loading={loading || printLoading}
                  loanLoading={screenLoanLoading}
                  isLoanActive={activeLoanAssetIds.has(a.id)}
                  onView={openPreview}
                  onEdit={openEdit}
                  onAssign={openAssignmentDrawerForAsset}
                  onLoan={openScreenLoanDrawerForAsset}
                  onReport={openIncidentDrawerForAsset}
                  onPrint={handlePrintAsset}
                  onDelete={setAssetToDelete}
                />
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
