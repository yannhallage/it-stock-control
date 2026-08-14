import { useCallback, useState } from 'react'
import { errorMessageFromUnknown } from '@shared/utils/errors'
import {
  createDepartmentService,
  deleteDepartmentService,
  listDepartmentsService,
  updateDepartmentService,
  type Department,
  type DepartmentCreatePayload,
  type DepartmentUpdatePayload,
  type ListDepartmentsParams,
} from '../services/departments.service'

export function useDepartments() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDepartments = useCallback(async (params?: ListDepartmentsParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listDepartmentsService(params ?? {})
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors du chargement des départements.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const createDepartment = useCallback(async (payload: DepartmentCreatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await createDepartmentService(payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, "Erreur lors de l'ajout du département."))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const updateDepartment = useCallback(async (id: number, payload: DepartmentUpdatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await updateDepartmentService(id, payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors de la mise à jour du département.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteDepartment = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      await deleteDepartmentService(id)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors de la suppression du département.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { fetchDepartments, createDepartment, updateDepartment, deleteDepartment, loading, error }
}

export type { Department }
