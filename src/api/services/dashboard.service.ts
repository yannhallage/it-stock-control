import { ENDPOINTS } from '../endpoints'
import { get } from '../http'
import type { MachinesStatsGranularity, MachinesStatsPoint } from '../../types'

export function fetchMachinesStatsService(
  granularity: MachinesStatsGranularity,
): Promise<MachinesStatsPoint[]> {
  const query = new URLSearchParams({ granularity }).toString()
  return get<MachinesStatsPoint[]>(`${ENDPOINTS.dashboard}/machines-stats?${query}`)
}
