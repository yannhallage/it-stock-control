import { ENDPOINTS } from '@core/http/endpoints'
import { del, get, post, put } from '@core/http/http'

export type Brand = {
  id: number
  name: string
  createdAt?: string
  updatedAt?: string
}

export type ListBrandsParams = { search?: string }
export type BrandCreatePayload = { name: string }
export type BrandUpdatePayload = { name?: string }

export function listBrandsService(params: ListBrandsParams = {}): Promise<Brand[]> {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.brands.base}?${query}` : ENDPOINTS.brands.base
  return get<Brand[]>(path)
}

export function createBrandService(payload: BrandCreatePayload): Promise<Brand> {
  return post<BrandCreatePayload, Brand>(ENDPOINTS.brands.base, payload)
}

export function updateBrandService(id: number, payload: BrandUpdatePayload): Promise<Brand> {
  return put<BrandUpdatePayload, Brand>(`${ENDPOINTS.brands.base}/${id}`, payload)
}

export function deleteBrandService(id: number): Promise<void> {
  return del<void>(`${ENDPOINTS.brands.base}/${id}`)
}
