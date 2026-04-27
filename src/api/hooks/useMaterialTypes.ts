import { useCallback, useState } from 'react'
import { errorMessageFromUnknown } from '../../lib/errors'
import {
  createMaterialTypeService,
  deleteMaterialTypeService,
  listMaterialTypesService,
  updateMaterialTypeService,
  type ListMaterialTypesParams,
  type MaterialType,
  type MaterialTypeCreatePayload,
  type MaterialTypeUpdatePayload,
} from '../services/material-types.service'

type UseMaterialTypesResult = {
  fetchMaterialTypes: (params?: ListMaterialTypesParams) => Promise<MaterialType[]>
  createMaterialType: (payload: MaterialTypeCreatePayload) => Promise<MaterialType>
  updateMaterialType: (id: number, payload: MaterialTypeUpdatePayload) => Promise<MaterialType>
  deleteMaterialType: (id: number) => Promise<void>
  loading: boolean
  error: string | null
}

export function useMaterialTypes(): UseMaterialTypesResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMaterialTypes = useCallback(async (params?: ListMaterialTypesParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listMaterialTypesService(params ?? {})
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors du chargement des types de matériel.')
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (payload: MaterialTypeCreatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await createMaterialTypeService(payload)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, "Erreur lors de l'ajout du type de matériel.")
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(async (id: number, payload: MaterialTypeUpdatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await updateMaterialTypeService(id, payload)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors de la mise à jour du type de matériel.')
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const remove = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      await deleteMaterialTypeService(id)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors de la suppression du type de matériel.')
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    fetchMaterialTypes,
    createMaterialType: create,
    updateMaterialType: update,
    deleteMaterialType: remove,
    loading,
    error,
  }
}

