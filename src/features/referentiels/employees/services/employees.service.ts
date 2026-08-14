import { ENDPOINTS } from '@core/http/endpoints'
import { del, get, post, put } from '@core/http/http'
import type { AssignmentEmployee } from '@core/models'

export type Employee = AssignmentEmployee & {
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

export type ListEmployeesParams = { search?: string }
export type EmployeeCreatePayload = {
  firstName: string
  lastName: string
  email?: string
}
export type EmployeeUpdatePayload = {
  firstName?: string
  lastName?: string
  email?: string | null
}

export function listEmployeesService(params: ListEmployeesParams = {}): Promise<Employee[]> {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.employees.base}?${query}` : ENDPOINTS.employees.base
  return get<Employee[]>(path)
}

export function createEmployeeService(payload: EmployeeCreatePayload): Promise<Employee> {
  return post<EmployeeCreatePayload, Employee>(ENDPOINTS.employees.base, payload)
}

export function updateEmployeeService(id: string, payload: EmployeeUpdatePayload): Promise<Employee> {
  return put<EmployeeUpdatePayload, Employee>(`${ENDPOINTS.employees.base}/${id}`, payload)
}

export function deleteEmployeeService(id: string): Promise<void> {
  return del<void>(`${ENDPOINTS.employees.base}/${id}`)
}
