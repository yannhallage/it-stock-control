import { ENDPOINTS } from '@core/http/endpoints'
import { del, get, post, put } from '@core/http/http'

export type MaterialType = {
  id: number
  name: string
  description: string
}

export type ListMaterialTypesParams = {
  search?: string
}

export type MaterialTypeCreatePayload = {
  name: string
  description?: string
}

export type MaterialTypeUpdatePayload = {
  name?: string
  description?: string
}

export function listMaterialTypesService(params: ListMaterialTypesParams = {}): Promise<MaterialType[]> {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)

  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.materialTypes.base}?${query}` : ENDPOINTS.materialTypes.base

  return get<MaterialType[]>(path)
}

export function createMaterialTypeService(payload: MaterialTypeCreatePayload): Promise<MaterialType> {
  return post<MaterialTypeCreatePayload, MaterialType>(ENDPOINTS.materialTypes.base, payload)
}

export function updateMaterialTypeService(id: number, payload: MaterialTypeUpdatePayload): Promise<MaterialType> {
  return put<MaterialTypeUpdatePayload, MaterialType>(`${ENDPOINTS.materialTypes.base}/${id}`, payload)
}

export function deleteMaterialTypeService(id: number): Promise<void> {
  return del<void>(`${ENDPOINTS.materialTypes.base}/${id}`)
}

