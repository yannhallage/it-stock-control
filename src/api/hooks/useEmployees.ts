import { useCallback, useState } from 'react'
import { errorMessageFromUnknown } from '../../lib/errors'
import {
  createEmployeeService,
  deleteEmployeeService,
  listEmployeesService,
  updateEmployeeService,
  type Employee,
  type EmployeeCreatePayload,
  type EmployeeUpdatePayload,
  type ListEmployeesParams,
} from '../services/employees.service'

export function useEmployees() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEmployees = useCallback(async (params?: ListEmployeesParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listEmployeesService(params ?? {})
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors du chargement des employés.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const createEmployee = useCallback(async (payload: EmployeeCreatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await createEmployeeService(payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, "Erreur lors de l'ajout de l'employé."))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const updateEmployee = useCallback(async (id: string, payload: EmployeeUpdatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await updateEmployeeService(id, payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, "Erreur lors de la mise à jour de l'employé."))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteEmployee = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await deleteEmployeeService(id)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, "Erreur lors de la suppression de l'employé."))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { fetchEmployees, createEmployee, updateEmployee, deleteEmployee, loading, error }
}

export type { Employee }
