import { ENDPOINTS } from '../endpoints'
import { get, patch, post } from '../http'
import type { Incident } from '../../types'

export type IncidentStatus = 'OUVERT' | 'CLOS'

export type ListIncidentsParams = {
  assetId?: number
  status?: IncidentStatus
}

export type CreateIncidentPayload = {
  description: string
  reportedAt: string
  department: string
}

export type CreateIncidentResponse = {
  incident: Incident
  historyEvents: Array<{ id: number; assetId: number; type: string; payload: Record<string, unknown>; createdAt: string }>
}

export type UpdateIncidentStatusPayload = {
  status: IncidentStatus
}

export function listIncidentsService(params: ListIncidentsParams = {}): Promise<Incident[]> {
  const searchParams = new URLSearchParams()
  if (params.assetId != null) searchParams.set('assetId', String(params.assetId))
  if (params.status) searchParams.set('status', params.status)

  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.incidents.base}?${query}` : ENDPOINTS.incidents.base

  return get<Incident[]>(path)
}

export function getIncidentByIdService(id: number): Promise<Incident> {
  return get<Incident>(`${ENDPOINTS.incidents.base}/${id}`)
}

export function createIncidentForAssetService(
  assetId: number,
  payload: CreateIncidentPayload,
): Promise<CreateIncidentResponse> {
  return post<CreateIncidentPayload, CreateIncidentResponse>(
    `${ENDPOINTS.assets.base}/${assetId}/incidents`,
    payload,
  )
}

export function updateIncidentStatusService(
  id: number,
  payload: UpdateIncidentStatusPayload,
): Promise<Incident> {
  return patch<UpdateIncidentStatusPayload, Incident>(`${ENDPOINTS.incidents.base}/${id}/status`, payload)
}
