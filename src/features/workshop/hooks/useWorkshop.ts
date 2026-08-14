import { useCallback, useState } from 'react'
import {
  closeRepairService,
  getRepairByIdService,
  listRepairsService,
  startRepairService,
  type CloseRepairPayload,
  type ListRepairsParams,
  type RepairWithRelations,
  type StartRepairPayload,
} from '../services/workshop.service'

type UseWorkshopResult = {
  fetchRepairs: (params?: ListRepairsParams) => Promise<RepairWithRelations[]>
  getRepairById: (id: number) => Promise<RepairWithRelations>
  startRepair: (payload: StartRepairPayload) => Promise<RepairWithRelations>
  closeRepair: (id: number, payload: CloseRepairPayload) => Promise<RepairWithRelations>
  loading: boolean
  error: string | null
}

export function useWorkshop(): UseWorkshopResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRepairs = useCallback(async (params?: ListRepairsParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listRepairsService(params ?? {})
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors du chargement des réparations.'
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const getById = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      return await getRepairByIdService(id)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la récupération de la réparation.'
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const start = useCallback(async (payload: StartRepairPayload) => {
    setLoading(true)
    setError(null)
    try {
      return await startRepairService(payload)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors du démarrage de la réparation.'
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const close = useCallback(async (id: number, payload: CloseRepairPayload) => {
    setLoading(true)
    setError(null)
    try {
      return await closeRepairService(id, payload)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la clôture de la réparation.'
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    fetchRepairs,
    getRepairById: getById,
    startRepair: start,
    closeRepair: close,
    loading,
    error,
  }
}
