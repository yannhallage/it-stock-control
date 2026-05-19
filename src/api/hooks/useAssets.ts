import { useCallback, useState } from 'react'
import { errorMessageFromUnknown } from '../../lib/errors'
import type { Asset, AssetDetailsApi } from '../../types'
import {
  createAssetService,
  deleteAssetService,
  getAssetByIdService,
  listAssetsService,
  updateAssetService,
  type AssetCreatePayload,
  type AssetUpdatePayload,
  type ListAssetsParams,
} from '../services/assets.service'

type UseAssetsResult = {
  fetchAssets: (params?: ListAssetsParams) => Promise<Asset[]>
  getAssetById: (id: number) => Promise<AssetDetailsApi>
  createAsset: (payload: AssetCreatePayload) => Promise<Asset>
  updateAsset: (id: number, payload: AssetUpdatePayload) => Promise<Asset>
  deleteAsset: (id: number) => Promise<void>
  loading: boolean
  error: string | null
}

export function useAssets(): UseAssetsResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAssets = useCallback(async (params?: ListAssetsParams) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listAssetsService(params ?? {})
      return res
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors du chargement des matériels.')
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
      return await getAssetByIdService(id)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors du chargement du détail du matériel.')
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (payload: AssetCreatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await createAssetService(payload)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, "Erreur lors de l'ajout du matériel.")
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(async (id: number, payload: AssetUpdatePayload) => {
    setLoading(true)
    setError(null)
    try {
      return await updateAssetService(id, payload)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors de la mise à jour du matériel.')
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
      await deleteAssetService(id)
    } catch (e: unknown) {
      const message = errorMessageFromUnknown(e, 'Erreur lors de la suppression du matériel.')
      setError(String(message))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { fetchAssets, getAssetById: getById, createAsset: create, updateAsset: update, deleteAsset: remove, loading, error }
}

