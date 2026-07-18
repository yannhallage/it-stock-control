import { useCallback, useState } from 'react'
import { errorMessageFromUnknown } from '../../lib/errors'
import {
  createBrandService,
  deleteBrandService,
  listBrandsService,
  updateBrandService,
  type Brand,
  type BrandCreatePayload,
  type BrandUpdatePayload,
  type ListBrandsParams,
} from '../services/brands.service'

export function useBrands() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBrands = useCallback(async (params?: ListBrandsParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listBrandsService(params ?? {})
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors du chargement des marques.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const createBrand = useCallback(async (payload: BrandCreatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await createBrandService(payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, "Erreur lors de l'ajout de la marque."))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const updateBrand = useCallback(async (id: number, payload: BrandUpdatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await updateBrandService(id, payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors de la mise à jour de la marque.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteBrand = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      await deleteBrandService(id)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors de la suppression de la marque.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { fetchBrands, createBrand, updateBrand, deleteBrand, loading, error }
}

export type { Brand }
