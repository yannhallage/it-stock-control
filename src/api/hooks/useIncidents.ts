import { useCallback, useState } from 'react'
import type { Incident } from '../../types'
import {
  createIncidentForAssetService,
  getIncidentByIdService,
  listIncidentsService,
  updateIncidentStatusService,
  type CreateIncidentPayload,
  type ListIncidentsParams,
  type UpdateIncidentStatusPayload,
} from '../services/incidents.service'

type UseIncidentsResult = {
  fetchIncidents: (params?: ListIncidentsParams) => Promise<Incident[]>
  getIncidentById: (id: number) => Promise<Incident>
  createIncidentForAsset: (assetId: number, payload: CreateIncidentPayload) => Promise<Incident>
  updateIncidentStatus: (id: number, payload: UpdateIncidentStatusPayload) => Promise<Incident>
  loading: boolean
  error: string | null
}

export function useIncidents(): UseIncidentsResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchIncidents = useCallback(async (params?: ListIncidentsParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listIncidentsService(params ?? {})
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors du chargement des incidents.'
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
      return await getIncidentByIdService(id)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors de la récupération de l'incident."
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const createForAsset = useCallback(async (assetId: number, payload: CreateIncidentPayload) => {
    setLoading(true)
    setError(null)
    try {
      const { incident } = await createIncidentForAssetService(assetId, payload)
      return incident
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors de l'enregistrement de l'incident."
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const updateStatus = useCallback(async (id: number, payload: UpdateIncidentStatusPayload) => {
    setLoading(true)
    setError(null)
    try {
      return await updateIncidentStatusService(id, payload)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors de la mise à jour du statut de l'incident."
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    fetchIncidents,
    getIncidentById: getById,
    createIncidentForAsset: createForAsset,
    updateIncidentStatus: updateStatus,
    loading,
    error,
  }
}
