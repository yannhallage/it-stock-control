import { ENDPOINTS } from '@core/http/endpoints'
import { del, get, patch, post } from '@core/http/http'
import type { Asset, AssetDetailsApi, AssetStatus, InventorySummary } from '@core/models'

export type ListAssetsParams = {
  q?: string
  status?: AssetStatus | ''
  departmentId?: number
  employeeId?: string
  materialTypeId?: number
  materialTypeIds?: number[]
  categoryId?: number
  brandId?: number
  computer?: string
  entryDateFrom?: string
  entryDateTo?: string
  warrantyExpired?: boolean
  minAgeYears?: number
  physicalInventoryPending?: boolean
}

export type AssetCreatePayload = {
  inventoryNumber?: string
  serialNumber?: string | null
  categoryId: number
  materialTypeId: number
  brandId: number
  supplierId?: number
  locationId?: number
  model: string
  entryDate: string
  purchasePrice?: number
  warrantyStartDate?: string
  warrantyEndDate?: string
  status?: AssetStatus
}

export type AssetUpdatePayload = Partial<AssetCreatePayload>

type RawAsset = Asset & {
  serial_number?: string | null
}

function normalizeAsset<T extends RawAsset>(asset: T): T {
  return {
    ...asset,
    serialNumber: asset.serialNumber ?? asset.serial_number ?? null,
  }
}

function buildAssetsQuery(params: ListAssetsParams = {}): string {
  const searchParams = new URLSearchParams()
  if (params.q) searchParams.set('search', params.q)
  if (params.status) searchParams.set('status', params.status)
  if (params.departmentId != null) searchParams.set('departmentId', String(params.departmentId))
  if (params.employeeId) searchParams.set('employeeId', params.employeeId)
  if (params.materialTypeId != null) searchParams.set('materialTypeId', String(params.materialTypeId))
  if (params.materialTypeIds?.length) {
    for (const id of params.materialTypeIds) {
      searchParams.append('materialTypeIds', String(id))
    }
  }
  if (params.categoryId != null) searchParams.set('categoryId', String(params.categoryId))
  if (params.brandId != null) searchParams.set('brandId', String(params.brandId))
  if (params.computer) searchParams.set('computer', params.computer)
  if (params.entryDateFrom) searchParams.set('entryDateFrom', params.entryDateFrom)
  if (params.entryDateTo) searchParams.set('entryDateTo', params.entryDateTo)
  if (params.warrantyExpired) searchParams.set('warrantyExpired', 'true')
  if (params.minAgeYears != null) searchParams.set('minAgeYears', String(params.minAgeYears))
  if (params.physicalInventoryPending) searchParams.set('physicalInventoryPending', 'true')
  return searchParams.toString()
}

export function listAssetsService(params: ListAssetsParams = {}): Promise<Asset[]> {
  const query = buildAssetsQuery(params)
  const path = query ? `${ENDPOINTS.assets.base}?${query}` : ENDPOINTS.assets.base

  return get<RawAsset[]>(path).then((items) => items.map(normalizeAsset))
}

export function getInventorySummaryService(params: ListAssetsParams = {}): Promise<InventorySummary> {
  const query = buildAssetsQuery(params)
  const path = query
    ? `${ENDPOINTS.assets.inventorySummary}?${query}`
    : ENDPOINTS.assets.inventorySummary
  return get<InventorySummary>(path)
}

export function markPhysicalInventoryService(
  id: number,
  note?: string | null,
): Promise<Asset> {
  return post<{ note?: string | null }, RawAsset>(ENDPOINTS.assets.physicalInventory(id), {
    note: note ?? null,
  }).then(normalizeAsset)
}

export function getAssetByIdService(id: number): Promise<AssetDetailsApi> {
  return get<RawAsset & AssetDetailsApi>(`${ENDPOINTS.assets.base}/${id}`).then(
    (asset) => normalizeAsset(asset) as AssetDetailsApi,
  )
}

export function createAssetService(payload: AssetCreatePayload): Promise<Asset> {
  return post<AssetCreatePayload, RawAsset>(ENDPOINTS.assets.base, payload).then(normalizeAsset)
}

export function updateAssetService(id: number, payload: AssetUpdatePayload): Promise<Asset> {
  return patch<AssetUpdatePayload, RawAsset>(`${ENDPOINTS.assets.base}/${id}`, payload).then(normalizeAsset)
}

export function deleteAssetService(id: number): Promise<void> {
  return del<void>(`${ENDPOINTS.assets.base}/${id}`)
}
