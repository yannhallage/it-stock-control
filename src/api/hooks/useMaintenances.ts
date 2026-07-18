import { useCallback, useState } from 'react'
import { errorMessageFromUnknown } from '../../lib/errors'
import type { Maintenance } from '../../types'
import {
  createMaintenanceService,
  deleteMaintenanceService,
  listMaintenancesService,
  updateMaintenanceService,
  updateMaintenanceStatusService,
  type CreateMaintenancePayload,
  type ListMaintenancesParams,
  type UpdateMaintenancePayload,
  type UpdateMaintenanceStatusPayload,
} from '../services/maintenances.service'

export function useMaintenances() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMaintenances = useCallback(async (params?: ListMaintenancesParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listMaintenancesService(params ?? {})
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors du chargement des maintenances.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const createMaintenance = useCallback(async (payload: CreateMaintenancePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await createMaintenanceService(payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, "Erreur lors de l'ajout de la maintenance."))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const updateMaintenance = useCallback(async (id: number, payload: UpdateMaintenancePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await updateMaintenanceService(id, payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors de la mise à jour de la maintenance.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const updateStatus = useCallback(async (id: number, payload: UpdateMaintenanceStatusPayload) => {
    setLoading(true)
    setError(null)
    try {
      return await updateMaintenanceStatusService(id, payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors du changement de statut.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteMaintenance = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      await deleteMaintenanceService(id)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors de la suppression de la maintenance.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    fetchMaintenances,
    createMaintenance,
    updateMaintenance,
    updateMaintenanceStatus: updateStatus,
    deleteMaintenance,
    loading,
    error,
  }
}

export type { Maintenance }
