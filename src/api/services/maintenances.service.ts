import { ENDPOINTS } from '../endpoints'
import { del, get, patch, post, put } from '../http'
import type { Maintenance, MaintenanceStatus } from '../../types'

export type ListMaintenancesParams = {
  assetId?: number
  status?: MaintenanceStatus
  search?: string
}

export type CreateMaintenancePayload = {
  assetId: number
  title: string
  scheduledDate: string
  description?: string
  completedDate?: string
  technician?: string
  cost?: number
  status?: MaintenanceStatus
}

export type UpdateMaintenancePayload = Partial<Omit<CreateMaintenancePayload, 'assetId'>> & {
  assetId?: number
}

export type UpdateMaintenanceStatusPayload = {
  status: MaintenanceStatus
}

export function listMaintenancesService(params: ListMaintenancesParams = {}): Promise<Maintenance[]> {
  const searchParams = new URLSearchParams()
  if (params.assetId != null) searchParams.set('assetId', String(params.assetId))
  if (params.status) searchParams.set('status', params.status)
  if (params.search) searchParams.set('search', params.search)
  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.maintenances.base}?${query}` : ENDPOINTS.maintenances.base
  return get<Maintenance[]>(path)
}

export function getMaintenanceByIdService(id: number): Promise<Maintenance> {
  return get<Maintenance>(`${ENDPOINTS.maintenances.base}/${id}`)
}

export function createMaintenanceService(payload: CreateMaintenancePayload): Promise<Maintenance> {
  return post<CreateMaintenancePayload, Maintenance>(ENDPOINTS.maintenances.base, payload)
}

export function updateMaintenanceService(id: number, payload: UpdateMaintenancePayload): Promise<Maintenance> {
  return put<UpdateMaintenancePayload, Maintenance>(`${ENDPOINTS.maintenances.base}/${id}`, payload)
}

export function updateMaintenanceStatusService(
  id: number,
  payload: UpdateMaintenanceStatusPayload,
): Promise<Maintenance> {
  return patch<UpdateMaintenanceStatusPayload, Maintenance>(
    `${ENDPOINTS.maintenances.base}/${id}/status`,
    payload,
  )
}

export function deleteMaintenanceService(id: number): Promise<void> {
  return del<void>(`${ENDPOINTS.maintenances.base}/${id}`)
}
