import { ENDPOINTS } from '../endpoints'
import { get, post } from '../http'
import type { AssetMovement, MovementType } from '../../types'

export type ListMovementsParams = {
  assetId?: number
}

export type CreateMovementPayload = {
  assetId: number
  movementType: MovementType
  movedAt: string
  fromLocationId?: number
  toLocationId?: number
  note?: string
}

export function listMovementsService(params: ListMovementsParams = {}): Promise<AssetMovement[]> {
  const searchParams = new URLSearchParams()
  if (params.assetId != null) searchParams.set('assetId', String(params.assetId))
  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.movements.base}?${query}` : ENDPOINTS.movements.base
  return get<AssetMovement[]>(path)
}

export function createMovementService(payload: CreateMovementPayload): Promise<AssetMovement> {
  return post<CreateMovementPayload, AssetMovement>(ENDPOINTS.movements.base, payload)
}
