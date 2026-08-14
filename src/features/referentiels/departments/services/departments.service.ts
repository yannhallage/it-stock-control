import { ENDPOINTS } from '@core/http/endpoints'
import { del, get, post, put } from '@core/http/http'

export type Department = {
  id: number
  name: string
  createdAt?: string
  updatedAt?: string
}

export type ListDepartmentsParams = { search?: string }
export type DepartmentCreatePayload = { name: string }
export type DepartmentUpdatePayload = { name?: string }

export function listDepartmentsService(params: ListDepartmentsParams = {}): Promise<Department[]> {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.departments.base}?${query}` : ENDPOINTS.departments.base
  return get<Department[]>(path)
}

export function createDepartmentService(payload: DepartmentCreatePayload): Promise<Department> {
  return post<DepartmentCreatePayload, Department>(ENDPOINTS.departments.base, payload)
}

export function updateDepartmentService(id: number, payload: DepartmentUpdatePayload): Promise<Department> {
  return put<DepartmentUpdatePayload, Department>(`${ENDPOINTS.departments.base}/${id}`, payload)
}

export function deleteDepartmentService(id: number): Promise<void> {
  return del<void>(`${ENDPOINTS.departments.base}/${id}`)
}
