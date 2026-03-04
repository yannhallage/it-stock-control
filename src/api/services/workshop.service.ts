import { ENDPOINTS } from '../endpoints'
import { get, patch, post } from '../http'
import type { Asset, Incident, Repair } from '../../types'

export type RepairStatus = 'EN_COURS' | 'TERMINE'

export type ListRepairsParams = {
  status?: RepairStatus
}

/** Réparation avec incident et matériel (selon la réponse backend) */
export type RepairWithRelations = Repair & {
  incident?: Incident & { asset?: Asset }
}

export type StartRepairPayload = {
  incidentId: number
  workshopEntryDate: string
  action?: string
  cost?: number
}

export type CloseRepairPayload = {
  outcome: 'EN_SERVICE' | 'HORS_SERVICE'
}

export function listRepairsService(params: ListRepairsParams = {}): Promise<RepairWithRelations[]> {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)

  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.workshop.base}?${query}` : ENDPOINTS.workshop.base

  return get<RepairWithRelations[]>(path)
}

export function getRepairByIdService(id: number): Promise<RepairWithRelations> {
  return get<RepairWithRelations>(`${ENDPOINTS.workshop.base}/${id}`)
}

export function startRepairService(payload: StartRepairPayload): Promise<RepairWithRelations> {
  return post<StartRepairPayload, RepairWithRelations>(`${ENDPOINTS.workshop.base}/start`, payload)
}

export function closeRepairService(id: number, payload: CloseRepairPayload): Promise<RepairWithRelations> {
  return patch<CloseRepairPayload, RepairWithRelations>(`${ENDPOINTS.workshop.base}/${id}/close`, payload)
}
