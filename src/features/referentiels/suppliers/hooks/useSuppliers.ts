import { useCallback, useState } from 'react'
import { errorMessageFromUnknown } from '@shared/utils/errors'
import {
  createSupplierService,
  deleteSupplierService,
  listSuppliersService,
  updateSupplierService,
  type ListSuppliersParams,
  type Supplier,
  type SupplierCreatePayload,
  type SupplierUpdatePayload,
} from '../services/suppliers.service'

type UseSuppliersResult = {
  fetchSuppliers: (params?: ListSuppliersParams) => Promise<Supplier[]>
  createSupplier: (payload: SupplierCreatePayload) => Promise<Supplier>
  updateSupplier: (id: number, payload: SupplierUpdatePayload) => Promise<Supplier>
  deleteSupplier: (id: number) => Promise<void>
  loading: boolean
  error: string | null
}

export function useSuppliers(): UseSuppliersResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSuppliers = useCallback(async (params?: ListSuppliersParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listSuppliersService(params ?? {})
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors du chargement des fournisseurs.')
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (payload: SupplierCreatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await createSupplierService(payload)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, "Erreur lors de l'ajout du fournisseur.")
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(async (id: number, payload: SupplierUpdatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await updateSupplierService(id, payload)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors de la mise à jour du fournisseur.')
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
      await deleteSupplierService(id)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors de la suppression du fournisseur.')
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    fetchSuppliers,
    createSupplier: create,
    updateSupplier: update,
    deleteSupplier: remove,
    loading,
    error,
  }
}

