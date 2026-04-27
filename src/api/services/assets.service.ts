import { ENDPOINTS } from '../endpoints'
import { del, get, patch, post } from '../http'
import type { Asset, AssetStatus } from '../../types'
import type { AssetDetailsApi } from '../../types'

export type ListAssetsParams = {
  q?: string
  type?: string
  status?: AssetStatus | ''
  with?: string
}

export type AssetCreatePayload = {
  inventoryNumber: string
  serialNumber?: string
  type: string
  brand: string
  model: string
  entryDate: string
  warrantyMonths?: number
  supplier: string
}

type RawAsset = Asset & {
  serial_number?: string | null
  warrantyStartDate?: string | null
  warrantyEndDate?: string | null
}

function normalizeAsset(asset: RawAsset): Asset {
  return {
    ...asset,
    serialNumber: asset.serialNumber ?? asset.serial_number ?? undefined,
  }
}

export function listAssetsService(params: ListAssetsParams = {}): Promise<Asset[]> {
  const searchParams = new URLSearchParams()
  if (params.q) searchParams.set('q', params.q)
  if (params.type) searchParams.set('type', params.type)
  if (params.status) searchParams.set('status', params.status)
  if (params.with) searchParams.set('with', params.with)

  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.assets.base}?${query}` : ENDPOINTS.assets.base

  return get<RawAsset[]>(path).then((items) => items.map(normalizeAsset))
}

export function getAssetByIdService(id: number): Promise<AssetDetailsApi> {
  return get<RawAsset & AssetDetailsApi>(`${ENDPOINTS.assets.base}/${id}`).then((asset) => normalizeAsset(asset) as AssetDetailsApi)
}

export function createAssetService(payload: AssetCreatePayload): Promise<Asset> {
  const body = {
    ...payload,
    serial_number: payload.serialNumber,
  }
  return post<typeof body, RawAsset>(ENDPOINTS.assets.base, body).then(normalizeAsset)
}

export type AssetUpdatePayload = Partial<AssetCreatePayload>

export function updateAssetService(id: number, payload: AssetUpdatePayload): Promise<Asset> {
  const body = {
    ...payload,
    serial_number: payload.serialNumber,
  }
  return patch<typeof body, RawAsset>(`${ENDPOINTS.assets.base}/${id}`, body).then(normalizeAsset)
}

export function deleteAssetService(id: number): Promise<void> {
  return del<void>(`${ENDPOINTS.assets.base}/${id}`)
}

