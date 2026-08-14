import { ENDPOINTS } from '@core/http/endpoints'
import { get, patch, post } from '@core/http/http'
import type { Asset, Incident, Repair } from '@core/models'

export type RepairStatus = 'EN_COURS' | 'TERMINE'

export type ListRepairsParams = {
  status?: RepairStatus
}

/** Réparation avec incident et matériel (selon la réponse backend) */
export type RepairWithRelations = Omit<Repair, 'workshopIn' | 'workshopOut' | 'cost'> & {
  /** Ancien champ ou mock */
  workshopIn?: string
  workshopOut?: string | null
  /** Champ renvoyé par l’API (camelCase) */
  workshopEntryDate?: string
  workshopExitDate?: string | null
  /** Nom du technicien ayant pris en charge la réparation */
  technicianName?: string
  /** Coût parfois renvoyé en string par l’API */
  cost?: number | string
  incident?: Incident & { asset?: Asset }
}

export type StartRepairPayload = {
  incidentId: number
  workshopEntryDate: string
  technicianName: string
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
