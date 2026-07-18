import { useCallback, useState } from 'react'
import { errorMessageFromUnknown } from '../../lib/errors'
import {
  createCategoryService,
  deleteCategoryService,
  listCategoriesService,
  updateCategoryService,
  type Category,
  type CategoryCreatePayload,
  type CategoryUpdatePayload,
  type ListCategoriesParams,
} from '../services/categories.service'

export function useCategories() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async (params?: ListCategoriesParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listCategoriesService(params ?? {})
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors du chargement des catégories.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const createCategory = useCallback(async (payload: CategoryCreatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await createCategoryService(payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, "Erreur lors de l'ajout de la catégorie."))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const updateCategory = useCallback(async (id: number, payload: CategoryUpdatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await updateCategoryService(id, payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors de la mise à jour de la catégorie.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteCategory = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      await deleteCategoryService(id)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors de la suppression de la catégorie.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { fetchCategories, createCategory, updateCategory, deleteCategory, loading, error }
}

export type { Category }
