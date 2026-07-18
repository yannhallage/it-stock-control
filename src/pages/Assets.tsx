import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useAssignments } from '../api/hooks/useAssignments'
import { useBrands } from '../api/hooks/useBrands'
import { useCategories } from '../api/hooks/useCategories'
import { useDepartments } from '../api/hooks/useDepartments'
import { useImpression } from '../api/hooks/useImpression'
import { useLocations } from '../api/hooks/useLocations'
import { useScreenLoans } from '../api/hooks/useScreenLoans'
import { useSuppliers } from '../api/hooks/useSuppliers'
import { useMaterialTypes } from '../api/hooks/useMaterialTypes'
import { listKnownUsersFromAssignmentsService } from '../api/services/assignments.service'
import type { Brand } from '../api/services/brands.service'
import type { Category } from '../api/services/categories.service'
import type { Location } from '../api/services/locations.service'
import {
  formatUserName,
  getBrandName,
  getDepartmentName,
  getSerialNumber,
  getSupplierName,
  getTypeName,
} from '../lib/asset-labels'
import { errorMessageFromUnknown } from '../lib/errors'
import { formatDate } from '../lib/format'
import type { Asset, AssetDetailsApi, AssetStatus, Assignment, ScreenLoan } from '../types'
import type { Supplier } from '../api/services/suppliers.service'
import type { MaterialType } from '../api/services/material-types.service'
import { StatusBadge } from '../components/Badge'
import { CalendarFilterModal, type CalendarFilterValue } from '../components/CalendarFilterModal'
import { DrawerAssets, type AssetCreateFormState } from '../components/drawers/DrawerAssets'
import { DrawerAssetsUpdate } from '../components/drawers/DrawerAssetsUpdate'
import { DrawerAssignments } from '../components/drawers/DrawerAssignments'
import { DrawerScreenLoan } from '../components/drawers/DrawerScreenLoan'
import { ReportIncidentDrawer } from '../components/drawers/ReportIncidentDrawer'
import { ConfirmModal, Modal } from '../components/Modal'
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

/** Recherche locale (hors API) sur les champs affichés dans la liste. */
function assetMatchesQuery(a: Asset, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [
    a.inventoryNumber,
    getSerialNumber(a),
    getTypeName(a),
    getBrandName(a),
    a.model,
    getSupplierName(a),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

function diffInMonths(start: string, end: string): number | null {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null
  let months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth())
  if (endDate.getDate() < startDate.getDate()) months -= 1
  return months > 0 ? months : null
}

function warrantyLabel(asset: Asset): string {
  if (asset.warrantyEndDate) {
    const start = asset.warrantyStartDate ?? asset.entryDate
    const months = diffInMonths(start, asset.warrantyEndDate)
    if (months !== null) return `${months} mois`
  }
  return '—'
}

function addMonthsToDate(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function warrantyEndDateFromMonths(entryDate: string, warrantyMonths: string): string | undefined {
  const parsed = Number(warrantyMonths)
  if (!Number.isFinite(parsed) || parsed <= 0 || !entryDate) return undefined
  return addMonthsToDate(entryDate, parsed)
}

function warrantyMonthsFromAsset(asset: Asset): string {
  if (asset.warrantyEndDate) {
    const start = asset.warrantyStartDate ?? asset.entryDate
    const months = diffInMonths(start, asset.warrantyEndDate)
    if (months !== null) return String(months)
  }
  return ''
}

function nextInventoryForMaterialTypeId(
  materialTypeId: number,
  materialTypes: MaterialType[],
  assets: Asset[],
): string {
  const typeName = materialTypes.find((t) => t.id === materialTypeId)?.name ?? 'MAT'
  return nextSequentialInventoryNumber(typeName, assets)
}

function emptyAssetForm(inventoryNumber = ''): AssetCreateFormState {
  return {
    inventoryNumber,
    serialNumber: '',
    categoryId: '',
    materialTypeId: '',
    brandId: '',
    supplierId: '',
    locationId: '',
    model: '',
    entryDate: new Date().toISOString().slice(0, 10),
    warrantyMonths: '',
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function selectedAssetDateRange(value: CalendarFilterValue): { start: Date; end: Date } | null {
  if (!value) return null

  if (Array.isArray(value)) {
    const [rawStart, rawEnd] = value
    const start = rawStart ?? rawEnd
    const end = rawEnd ?? rawStart

    if (!start || !end) return null

    return {
      start: startOfDay(start),
      end: endOfDay(end),
    }
  }

  return {
    start: startOfDay(value),
    end: endOfDay(value),
  }
}

function assetDateRangeLabel(value: CalendarFilterValue): string {
  const range = selectedAssetDateRange(value)
  if (!range) return 'Date'

  const start = formatDate(range.start.toISOString())
  const end = formatDate(range.end.toISOString())

  return start === end ? start : `${start} - ${end}`
}

function assetDateRangePrintFilters(value: CalendarFilterValue): { entryDateFrom?: string; entryDateTo?: string } {
  const range = selectedAssetDateRange(value)
  if (!range) return {}

  return {
    entryDateFrom: range.start.toISOString(),
    entryDateTo: range.end.toISOString(),
  }
}

function assetMatchesDateRange(asset: Asset, value: CalendarFilterValue): boolean {
  const range = selectedAssetDateRange(value)
  if (!range) return true

  const entryDate = new Date(asset.entryDate)
  if (Number.isNaN(entryDate.getTime())) return false

  const time = entryDate.getTime()
  return time >= range.start.getTime() && time <= range.end.getTime()
}

function assignmentUsersLabel(assignment: Assignment | null | undefined): string {
  if (!assignment) return '—'
  return formatUserName(assignment.user)
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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"
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

function IncidentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4M12 17h.01" />
    </svg>
  )
}

function DotsVerticalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.75h.01M12 12h.01M12 17.25h.01"
      />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function DetailItem({
  label,
  children,
}: React.PropsWithChildren<{
  label: string
}>) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900">{children || '—'}</div>
    </div>
  )
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton-block rounded ${className}`} aria-hidden="true" />
}

function AssetPreviewSkeleton() {
  return (
    <div className="space-y-5" aria-label="Chargement du détail du matériel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[220px] flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-6 w-56 max-w-full" />
          <SkeletonBlock className="h-3 w-36" />
        </div>
        <SkeletonBlock className="h-6 w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <SkeletonBlock className="h-4 w-40" />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AssetPreviewModal({
  open,
  onClose,
  asset,
  loading,
  error,
}: {
  open: boolean
  onClose: () => void
  asset: AssetDetailsApi | null
  loading: boolean
  error: string | null
}) {
  const assignment = asset?.currentAssignment ?? null
  const assignmentUsers = assignment ? assignmentUsersLabel(assignment) : ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={asset ? `Aperçu ${asset.inventoryNumber}` : 'Aperçu du matériel'}
      closeOnBackdrop={!loading}
      footer={
        <Button
          type="button"
          variant="default"
          className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
          onClick={onClose}
          disabled={loading}
        >
          Fermer
        </Button>
      }
    >
      {loading ? (
        <AssetPreviewSkeleton />
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : asset ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-gray-500">{getTypeName(asset)}</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {getBrandName(asset)} {asset.model}
              </div>
              <div className="mt-1 text-xs text-gray-500">Inventaire {asset.inventoryNumber}</div>
            </div>
            <StatusBadge status={asset.currentStatus ?? asset.status} />
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <DetailItem label="N° série">{getSerialNumber(asset)}</DetailItem>
            <DetailItem label="Fournisseur">{getSupplierName(asset)}</DetailItem>
            <DetailItem label="Date d'entrée">{formatDate(asset.entryDate) || '—'}</DetailItem>
            <DetailItem label="Date d'ajout">{formatDate(asset.createdAt) || '—'}</DetailItem>
            <DetailItem label="Garantie">{warrantyLabel(asset)}</DetailItem>
            <DetailItem label="Mise à jour">{formatDate(asset.updatedAt) || '—'}</DetailItem>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="text-sm font-semibold text-gray-900">Affectation actuelle</div>
            {assignment ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Direction / service">{getDepartmentName(assignment)}</DetailItem>
                <DetailItem label="Personne(s) assignée(s)">{assignmentUsers || '—'}</DetailItem>
                <DetailItem label="Date d'affectation">{formatDate(assignment.startDate) || '—'}</DetailItem>
              </div>
            ) : (
              <div className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Aucune affectation active.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-6 text-sm text-gray-600">Aucun matériel sélectionné.</div>
      )}
    </Modal>
  )
}

type ActionMenuPosition = {
  top?: number
  right: number
  bottom?: number
}

type AssetActionsMenuProps = {
  asset: Asset
  loading: boolean
  loanLoading: boolean
  isLoanActive: boolean
  onView: (assetId: number) => void
  onEdit: (asset: Asset) => void
  onAssign: (assetId: number) => void
  onLoan: (assetId: number) => void
  onReport: (assetId: number) => void
  onPrint: (inventoryNumber: string) => void
  onDelete: (assetId: number) => void
}

function AssetActionsMenu({
  asset,
  loading,
  loanLoading,
  isLoanActive,
  onView,
  onEdit,
  onAssign,
  onLoan,
  onReport,
  onPrint,
  onDelete,
}: AssetActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<ActionMenuPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const assignDisabled = asset.status !== 'EN_STOCK_NON_AFFECTE' || loading
  const loanDisabled = asset.status !== 'EN_STOCK_NON_AFFECTE' || isLoanActive || loading || loanLoading
  const reportDisabled =
    asset.status === 'EN_PANNE' || asset.status === 'EN_REPARATION' || loading

  const reportTitle =
    asset.status === 'EN_PANNE'
      ? 'Ce matériel est déjà en panne'
      : asset.status === 'EN_REPARATION'
        ? 'Ce matériel est déjà en réparation'
        : 'Signaler une panne pour ce matériel'

  const assignTitle =
    asset.status === 'EN_STOCK_NON_AFFECTE'
      ? 'Transférer / affecter vers une direction'
      : 'Réservé au matériel en stock non affecté'
  const loanTitle =
    isLoanActive || asset.status === 'EN_PRET'
      ? 'Ce matériel est déjà en prêt'
      : asset.status === 'EN_STOCK_NON_AFFECTE'
        ? 'Enregistrer un emprunt de matériel'
        : 'Réservé au matériel en stock non affecté'

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const menuHeight = 310
    const opensUp = rect.bottom + menuHeight > window.innerHeight && rect.top > menuHeight
    const next: ActionMenuPosition = {
      right: Math.max(8, window.innerWidth - rect.right),
      ...(opensUp
        ? { bottom: Math.max(8, window.innerHeight - rect.top + 6) }
        : { top: Math.min(rect.bottom + 6, window.innerHeight - 8) }),
    }
    setPosition(next)
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const handleScrollOrResize = () => updatePosition()

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [open, updatePosition])

  const menuStyle: React.CSSProperties | undefined = position
    ? {
        position: 'fixed',
        right: position.right,
        top: position.top,
        bottom: position.bottom,
      }
    : undefined

  const itemClass =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors'
  const enabledClass = 'cursor-pointer text-gray-700 hover:bg-gray-50 hover:text-gray-950'
  const disabledClass = 'cursor-not-allowed text-gray-300'

  const runAction = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        className={`inline-flex h-7 w-7 items-center justify-center cursor-pointer rounded border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60 ${
          loading || loanLoading ? 'opacity-70' : ''
        }`}
        title="Actions"
        aria-label={`Actions pour ${asset.inventoryNumber}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <DotsVerticalIcon className="h-4 w-4" />
      </button>

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              className="z-[60] min-w-[230px] overflow-hidden rounded border border-gray-200 bg-white py-1 shadow-lg"
              style={menuStyle}
              role="menu"
              aria-label={`Actions pour ${asset.inventoryNumber}`}
            >
              <button
                type="button"
                className={`${itemClass} ${loading ? disabledClass : enabledClass}`}
                title="Voir"
                role="menuitem"
                disabled={loading}
                onClick={() => !loading && runAction(() => onView(asset.id))}
              >
                <EyeIcon className="h-3.5 w-3.5" />
                Voir
              </button>

              {loading ? (
                <span className={`${itemClass} ${disabledClass}`} role="menuitem" aria-disabled="true">
                  <HistoryIcon className="h-3.5 w-3.5" />
                  Historique / aperçu
                </span>
              ) : (
                <Link
                  to={`/assets/${asset.id}`}
                  className={`${itemClass} ${enabledClass}`}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <HistoryIcon className="h-3.5 w-3.5" />
                  Historique / aperçu
                </Link>
              )}

              <button
                type="button"
                className={`${itemClass} ${loading ? disabledClass : enabledClass}`}
                title="Modifier"
                role="menuitem"
                disabled={loading}
                onClick={() => !loading && runAction(() => onEdit(asset))}
              >
                <PencilIcon className="h-3.5 w-3.5" />
                Modifier
              </button>

              <button
                type="button"
                className={`${itemClass} ${assignDisabled ? disabledClass : enabledClass}`}
                title={assignTitle}
                role="menuitem"
                disabled={assignDisabled}
                onClick={() => !assignDisabled && runAction(() => onAssign(asset.id))}
              >
                <TransferAssignIcon className="h-3.5 w-3.5" />
                Affecter
              </button>

              <button
                type="button"
                className={`${itemClass} ${loanDisabled ? disabledClass : enabledClass}`}
                title={loanTitle}
                role="menuitem"
                disabled={loanDisabled}
                onClick={() => !loanDisabled && runAction(() => onLoan(asset.id))}
              >
                <ScreenLoanIcon className="h-3.5 w-3.5" />
                Emprunter
              </button>

              <button
                type="button"
                className={`${itemClass} ${reportDisabled ? disabledClass : enabledClass}`}
                title={reportTitle}
                role="menuitem"
                disabled={reportDisabled}
                onClick={() => !reportDisabled && runAction(() => onReport(asset.id))}
              >
                <IncidentIcon className="h-3.5 w-3.5" />
                Signaler une panne
              </button>

              <button
                type="button"
                className={`${itemClass} ${loading ? disabledClass : enabledClass}`}
                title="Imprimer la fiche du materiel"
                role="menuitem"
                disabled={loading}
                onClick={() => !loading && runAction(() => onPrint(asset.inventoryNumber))}
              >
                <PrintIcon className="h-3.5 w-3.5" />
                Imprimer
              </button>

              <div className="my-1 border-t border-gray-100" />

              <button
                type="button"
                className={`${itemClass} ${
                  loading ? disabledClass : 'cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700'
                }`}
                title="Supprimer"
                role="menuitem"
                disabled={loading}
                onClick={() => !loading && runAction(() => onDelete(asset.id))}
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

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
  const [assignUserId, setAssignUserId] = useState('')
  const [assignCustomUserId, setAssignCustomUserId] = useState('')
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])
  const [knownUsers, setKnownUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([])

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
    Promise.all([fetchDepartments(), listKnownUsersFromAssignmentsService()])
      .then(([depts, users]) => {
        setDepartments(depts ?? [])
        setKnownUsers(users ?? [])
      })
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des affectations.')
      })
  }, [assignmentDrawerOpen, fetchDepartments])

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
      serialNumber: getSerialNumber(a) === '—' ? '' : getSerialNumber(a),
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
    setAssignUserId('')
    setAssignCustomUserId('')
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
    const resolvedUserId = assignUserId.trim() || assignCustomUserId.trim()
    if (!resolvedUserId) {
      toast.warning('Veuillez sélectionner ou saisir un utilisateur.')
      return
    }
    if (!assignDepartmentId) {
      toast.warning('Veuillez sélectionner une direction.')
      return
    }
    try {
      await createAssignmentForAsset(Number(assignAssetId), {
        userId: resolvedUserId,
        departmentId: Number(assignDepartmentId),
        startDate: assignStartDate,
      })
      toast.success('Affectation créée avec succès.')
      setAssignAssetId('')
      setAssignDepartmentId('')
      setAssignUserId('')
      setAssignCustomUserId('')
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
        Êtes-vous sûr de vouloir supprimer <strong>{assetLabel}</strong> ? Cette action est irréversible.
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
        knownUsers={knownUsers}
        assetId={assignAssetId}
        setAssetId={setAssignAssetId}
        departmentId={assignDepartmentId}
        setDepartmentId={setAssignDepartmentId}
        userId={assignUserId}
        setUserId={setAssignUserId}
        customUserId={assignCustomUserId}
        setCustomUserId={setAssignCustomUserId}
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
            placeholder="Inventaire, n° série, type, marque, modèle, fournisseur…"
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
            'État',
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
                {a.currentAssignment ? formatUserName(a.currentAssignment.user) : '—'}
              </td>
              <td className="px-4 py-3 text-gray-600 text-[13px]">
                {a.currentAssignment ? getDepartmentName(a.currentAssignment) : '—'}
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
