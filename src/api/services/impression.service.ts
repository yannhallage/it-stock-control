import { ENDPOINTS, buildUrl } from '../endpoints'
import { getSession, handleAuthenticationFailure } from '../../lib/auth'
import type { AssetStatus } from '../../types'

export type AssetsPdfFilters = {
  search?: string
  type?: string
  status?: AssetStatus | ''
  entryDateFrom?: string
  entryDateTo?: string
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

export function downloadAssetsPdfService(filters: AssetsPdfFilters = {}): Promise<Blob> {
  const searchParams = new URLSearchParams()

  if (filters.search?.trim()) searchParams.set('search', filters.search.trim())
  if (filters.type?.trim()) searchParams.set('type', filters.type.trim())
  if (filters.status) searchParams.set('status', filters.status)
  if (filters.entryDateFrom) searchParams.set('entryDateFrom', filters.entryDateFrom)
  if (filters.entryDateTo) searchParams.set('entryDateTo', filters.entryDateTo)

  const query = searchParams.toString()
  return downloadPdf(query ? `${ENDPOINTS.impression.assets}?${query}` : ENDPOINTS.impression.assets)
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
