import { ENDPOINTS } from '../endpoints'
import { del, get, post, put } from '../http'

export type Location = {
  id: number
  name: string
  building?: string | null
  floor?: string | null
  room?: string | null
  createdAt?: string
  updatedAt?: string
}

export type ListLocationsParams = { search?: string }
export type LocationCreatePayload = {
  name: string
  building?: string
  floor?: string
  room?: string
}
export type LocationUpdatePayload = Partial<LocationCreatePayload>

export function listLocationsService(params: ListLocationsParams = {}): Promise<Location[]> {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  const query = searchParams.toString()
  const path = query ? `${ENDPOINTS.locations.base}?${query}` : ENDPOINTS.locations.base
  return get<Location[]>(path)
}

export function createLocationService(payload: LocationCreatePayload): Promise<Location> {
  return post<LocationCreatePayload, Location>(ENDPOINTS.locations.base, payload)
}

export function updateLocationService(id: number, payload: LocationUpdatePayload): Promise<Location> {
  return put<LocationUpdatePayload, Location>(`${ENDPOINTS.locations.base}/${id}`, payload)
}

export function deleteLocationService(id: number): Promise<void> {
  return del<void>(`${ENDPOINTS.locations.base}/${id}`)
}
