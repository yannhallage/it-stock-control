import { ENDPOINTS, buildUrl } from '../endpoints'
import { getSession, handleAuthenticationFailure } from '../../lib/auth'

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

export function downloadAssetsPdfService(): Promise<Blob> {
  return downloadPdf(ENDPOINTS.impression.assets)
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
