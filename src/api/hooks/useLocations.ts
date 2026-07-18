import { useCallback, useState } from 'react'
import { errorMessageFromUnknown } from '../../lib/errors'
import {
  createLocationService,
  deleteLocationService,
  listLocationsService,
  updateLocationService,
  type ListLocationsParams,
  type Location,
  type LocationCreatePayload,
  type LocationUpdatePayload,
} from '../services/locations.service'

export function useLocations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLocations = useCallback(async (params?: ListLocationsParams) => {
    setLoading(true)
    setError(null)
    try {
      return await listLocationsService(params ?? {})
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, 'Erreur lors du chargement des emplacements.'))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const createLocation = useCallback(async (payload: LocationCreatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await createLocationService(payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, "Erreur lors de l'ajout de l'emplacement."))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const updateLocation = useCallback(async (id: number, payload: LocationUpdatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await updateLocationService(id, payload)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, "Erreur lors de la mise à jour de l'emplacement."))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteLocation = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      await deleteLocationService(id)
    } catch (e: unknown) {
      setError(errorMessageFromUnknown(e, "Erreur lors de la suppression de l'emplacement."))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { fetchLocations, createLocation, updateLocation, deleteLocation, loading, error }
}

export type { Location }
