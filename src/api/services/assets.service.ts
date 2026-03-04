import { ENDPOINTS } from '../endpoints'
import { del, get, post } from '../http'
import type { Asset, AssetStatus } from '../../types'

export type ListAssetsParams = {
  q?: string
  type?: string
  status?: AssetStatus | ''
  with?: string
}

export type AssetCreatePayload = {
  inventoryNumber: string
  type: string
  brand: string
  model: string
  entryDate: string
  supplier: string
}

export function listAssetsService(params: ListAssetsParams = {}): Promise<Asset[]> {
  const searchParams = new URLSearchParams()
  if (params.q) searchParams.set('q', params.q)
  if (params.type) searchParams.set('type', params.type)
  if (params.status) searchParams.set('status', params.status)
  if (params.with) searchParams.set('with', params.with)

  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.assets.base}?${query}` : ENDPOINTS.assets.base

  return get<Asset[]>(path)
}

export function createAssetService(payload: AssetCreatePayload): Promise<Asset> {
  return post<AssetCreatePayload, Asset>(ENDPOINTS.assets.base, payload)
}

export function deleteAssetService(id: number): Promise<void> {
  return del<void>(`${ENDPOINTS.assets.base}/${id}`)
}

