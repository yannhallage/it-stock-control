import type { MaterialType } from '@features/referentiels/material-types'
import type { Asset, AssetStatus, Assignment } from '@core/models'
import type { CalendarFilterValue } from '@shared/ui'
import {
  formatEmployeeName,
  getBrandName,
  getSerialNumber,
  getSupplierName,
  getTypeName,
} from '@shared/utils/asset-labels'
import { formatDate } from '@shared/utils/format'
import type { AssetCreateFormState } from '../components/DrawerAssets'

export const statusOptions: Array<{ value: AssetStatus | ''; label: string }> = [
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
  return ascii.slice(0, 4) || 'MAT'
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Recherche locale (hors API) sur les champs affichés dans la liste. */
export function assetMatchesQuery(a: Asset, query: string): boolean {
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

export function warrantyLabel(asset: Asset): string {
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

export function warrantyEndDateFromMonths(entryDate: string, warrantyMonths: string): string | undefined {
  const parsed = Number(warrantyMonths)
  if (!Number.isFinite(parsed) || parsed <= 0 || !entryDate) return undefined
  return addMonthsToDate(entryDate, parsed)
}

export function warrantyMonthsFromAsset(asset: Asset): string {
  if (asset.warrantyEndDate) {
    const start = asset.warrantyStartDate ?? asset.entryDate
    const months = diffInMonths(start, asset.warrantyEndDate)
    if (months !== null) return String(months)
  }
  return ''
}

export function nextInventoryForMaterialTypeId(
  materialTypeId: number,
  materialTypes: MaterialType[],
  assets: Asset[],
): string {
  const typeName = materialTypes.find((t) => t.id === materialTypeId)?.name ?? 'MAT'
  return nextSequentialInventoryNumber(typeName, assets)
}

export function emptyAssetForm(inventoryNumber = ''): AssetCreateFormState {
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

export function selectedAssetDateRange(value: CalendarFilterValue): { start: Date; end: Date } | null {
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

export function assetDateRangeLabel(value: CalendarFilterValue): string {
  const range = selectedAssetDateRange(value)
  if (!range) return 'Date'

  const start = formatDate(range.start.toISOString())
  const end = formatDate(range.end.toISOString())

  return start === end ? start : `${start} - ${end}`
}

export function assetDateRangePrintFilters(value: CalendarFilterValue): {
  entryDateFrom?: string
  entryDateTo?: string
} {
  const range = selectedAssetDateRange(value)
  if (!range) return {}

  return {
    entryDateFrom: range.start.toISOString(),
    entryDateTo: range.end.toISOString(),
  }
}

export function assetMatchesDateRange(asset: Asset, value: CalendarFilterValue): boolean {
  const range = selectedAssetDateRange(value)
  if (!range) return true

  const entryDate = new Date(asset.entryDate)
  if (Number.isNaN(entryDate.getTime())) return false

  const time = entryDate.getTime()
  return time >= range.start.getTime() && time <= range.end.getTime()
}

export function assignmentEmployeeLabel(assignment: Assignment | null | undefined): string {
  if (!assignment) return '—'
  return formatEmployeeName(assignment.employee)
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
