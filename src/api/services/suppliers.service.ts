import { ENDPOINTS } from '../endpoints'
import { del, get, post, put } from '../http'

export type Supplier = {
  id: number
  name: string
  contact: string
  address: string
  createdAt?: string
}

export type ListSuppliersParams = {
  search?: string
}

export type SupplierCreatePayload = {
  name: string
  contact?: string
  address?: string
}

export type SupplierUpdatePayload = {
  name?: string
  contact?: string
  address?: string
}

export function listSuppliersService(params: ListSuppliersParams = {}): Promise<Supplier[]> {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)

  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.suppliers.base}?${query}` : ENDPOINTS.suppliers.base

  return get<Supplier[]>(path)
}

export function createSupplierService(payload: SupplierCreatePayload): Promise<Supplier> {
  return post<SupplierCreatePayload, Supplier>(ENDPOINTS.suppliers.base, payload)
}

export function updateSupplierService(id: number, payload: SupplierUpdatePayload): Promise<Supplier> {
  return put<SupplierUpdatePayload, Supplier>(`${ENDPOINTS.suppliers.base}/${id}`, payload)
}

export function deleteSupplierService(id: number): Promise<void> {
  return del<void>(`${ENDPOINTS.suppliers.base}/${id}`)
}

