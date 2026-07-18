import { ENDPOINTS } from '../endpoints'
import { del, get, post, put } from '../http'

export type Category = {
  id: number
  name: string
  createdAt?: string
  updatedAt?: string
}

export type ListCategoriesParams = { search?: string }
export type CategoryCreatePayload = { name: string }
export type CategoryUpdatePayload = { name?: string }

export function listCategoriesService(params: ListCategoriesParams = {}): Promise<Category[]> {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.categories.base}?${query}` : ENDPOINTS.categories.base
  return get<Category[]>(path)
}

export function createCategoryService(payload: CategoryCreatePayload): Promise<Category> {
  return post<CategoryCreatePayload, Category>(ENDPOINTS.categories.base, payload)
}

export function updateCategoryService(id: number, payload: CategoryUpdatePayload): Promise<Category> {
  return put<CategoryUpdatePayload, Category>(`${ENDPOINTS.categories.base}/${id}`, payload)
}

export function deleteCategoryService(id: number): Promise<void> {
  return del<void>(`${ENDPOINTS.categories.base}/${id}`)
}
