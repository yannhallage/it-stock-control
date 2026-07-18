import { ENDPOINTS, buildUrl } from '../endpoints'
import { getSession, handleAuthenticationFailure } from '../../lib/auth'
import type { AssetStatus, InventoryColumnKey } from '../../types'

export type AssetsPdfFilters = {
  search?: string
  materialTypeId?: number
  status?: AssetStatus | ''
  entryDateFrom?: string
  entryDateTo?: string
}

export type InventoryPdfFilters = {
  search?: string
  materialTypeId?: number
  materialTypeIds?: number[]
  status?: AssetStatus | ''
  departmentId?: number
  userId?: string
  entryDateFrom?: string
  entryDateTo?: string
  warrantyExpired?: boolean
  minAgeYears?: number
  physicalInventoryPending?: boolean
  columns?: InventoryColumnKey[]
}

async function downloadPdf(path: string): Promise<Blob> {
  const session = getSession()
  const headers: HeadersInit = {
    Accept: 'application/pdf',
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
  }

  const res = await fetch(buildUrl(path), {
    method: 'GET',
    headers,
    credentials: 'include',
  })

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      handleAuthenticationFailure()
    }
    const message = `Erreur API (${res.status})`
    throw new Error(message)
  }

  return res.blob()
}

function buildInventoryQuery(filters: InventoryPdfFilters = {}): string {
  const searchParams = new URLSearchParams()
  if (filters.search?.trim()) searchParams.set('search', filters.search.trim())
  if (filters.materialTypeId != null) searchParams.set('materialTypeId', String(filters.materialTypeId))
  if (filters.materialTypeIds?.length) {
    for (const id of filters.materialTypeIds) {
      searchParams.append('materialTypeIds', String(id))
    }
  }
  if (filters.status) searchParams.set('status', filters.status)
  if (filters.departmentId != null) searchParams.set('departmentId', String(filters.departmentId))
  if (filters.userId) searchParams.set('userId', filters.userId)
  if (filters.entryDateFrom) searchParams.set('entryDateFrom', filters.entryDateFrom)
  if (filters.entryDateTo) searchParams.set('entryDateTo', filters.entryDateTo)
  if (filters.warrantyExpired) searchParams.set('warrantyExpired', 'true')
  if (filters.minAgeYears != null) searchParams.set('minAgeYears', String(filters.minAgeYears))
  if (filters.physicalInventoryPending) searchParams.set('physicalInventoryPending', 'true')
  if (filters.columns?.length) {
    for (const col of filters.columns) searchParams.append('columns', col)
  }
  return searchParams.toString()
}

export function downloadAssetsPdfService(filters: AssetsPdfFilters = {}): Promise<Blob> {
  const searchParams = new URLSearchParams()

  if (filters.search?.trim()) searchParams.set('search', filters.search.trim())
  if (filters.materialTypeId != null) searchParams.set('materialTypeId', String(filters.materialTypeId))
  if (filters.status) searchParams.set('status', filters.status)
  if (filters.entryDateFrom) searchParams.set('entryDateFrom', filters.entryDateFrom)
  if (filters.entryDateTo) searchParams.set('entryDateTo', filters.entryDateTo)

  const query = searchParams.toString()
  return downloadPdf(query ? `${ENDPOINTS.impression.assets}?${query}` : ENDPOINTS.impression.assets)
}

export function downloadInventoryPdfService(filters: InventoryPdfFilters = {}): Promise<Blob> {
  const query = buildInventoryQuery(filters)
  return downloadPdf(
    query ? `${ENDPOINTS.impression.inventory}?${query}` : ENDPOINTS.impression.inventory,
  )
}

export function downloadSignaleticPdfService(filters: InventoryPdfFilters = {}): Promise<Blob> {
  const query = buildInventoryQuery(filters)
  return downloadPdf(
    query ? `${ENDPOINTS.impression.signaletic}?${query}` : ENDPOINTS.impression.signaletic,
  )
}

export function downloadAssetPdfByInventoryNumberService(inventoryNumber: string): Promise<Blob> {
  const query = new URLSearchParams({ inventoryNumber }).toString()
  return downloadPdf(`${ENDPOINTS.impression.asset}?${query}`)
}

export function downloadAssignmentsPdfService(): Promise<Blob> {
  return downloadPdf(ENDPOINTS.impression.assignments)
}

export function downloadAssignmentPdfByIdService(assignmentId: number): Promise<Blob> {
  const query = new URLSearchParams({ assignmentId: String(assignmentId) }).toString()
  return downloadPdf(`${ENDPOINTS.impression.assignments}?${query}`)
}

export function downloadSuppliersPdfService(): Promise<Blob> {
  return downloadPdf(ENDPOINTS.impression.suppliers)
}

export function downloadIncidentsPdfService(): Promise<Blob> {
  return downloadPdf(ENDPOINTS.impression.incidents)
}

export function downloadScreenLoansPdfService(): Promise<Blob> {
  return downloadPdf(ENDPOINTS.impression.screenLoans)
}

export function downloadScreenLoanPdfByIdService(loanId: number): Promise<Blob> {
  return downloadPdf(`${ENDPOINTS.impression.screenLoan}/${encodeURIComponent(String(loanId))}`)
}
