import { ENDPOINTS } from '../endpoints'
import { get, post } from '../http'
import type { Assignment, AssignmentUser } from '../../types'

export type ListAssignmentsParams = {
  assetId?: number
  activeOnly?: boolean
}

export type CreateAssignmentPayload = {
  userId: string
  departmentId: number
  startDate: string
  note?: string
}

export type CreateAssignmentResponse = Assignment
export type EndAssignmentResponse = Assignment

export function listAssignmentsService(params: ListAssignmentsParams = {}): Promise<Assignment[]> {
  const base = ENDPOINTS.assignments.base
  const searchParams = new URLSearchParams()
  if (params.assetId != null) searchParams.set('assetId', String(params.assetId))
  if (params.activeOnly != null) searchParams.set('activeOnly', String(params.activeOnly))

  const query = searchParams.toString()
  const path = query ? `${base}?${query}` : base

  return get<Assignment[]>(path)
}

export function listAllAssignmentsService(): Promise<Assignment[]> {
  return get<Assignment[]>(`${ENDPOINTS.assignments.base}/all`)
}

/** Users uniques extraits des affectations (pas d'endpoint /api/users). */
export async function listKnownUsersFromAssignmentsService(): Promise<AssignmentUser[]> {
  const assignments = await listAllAssignmentsService()
  const map = new Map<string, AssignmentUser>()
  for (const a of assignments) {
    if (a.user?.id) {
      map.set(a.user.id, a.user)
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr'),
  )
}

export function createAssignmentForAssetService(
  assetId: number,
  payload: CreateAssignmentPayload,
): Promise<CreateAssignmentResponse> {
  return post<CreateAssignmentPayload, CreateAssignmentResponse>(
    `${ENDPOINTS.assets.base}/${assetId}/assignments`,
    payload,
  )
}

export function endAssignmentService(id: number): Promise<EndAssignmentResponse> {
  return post<unknown, EndAssignmentResponse>(`${ENDPOINTS.assignments.base}/${id}/end`, {})
}
