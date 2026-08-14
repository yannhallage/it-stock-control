import { ENDPOINTS } from '@core/http/endpoints'
import { get } from '@core/http/http'
import type { MachinesStatsGranularity, MachinesStatsPoint } from '@core/models'

export function fetchMachinesStatsService(
  granularity: MachinesStatsGranularity,
): Promise<MachinesStatsPoint[]> {
  const query = new URLSearchParams({ granularity }).toString()
  return get<MachinesStatsPoint[]>(`${ENDPOINTS.dashboard}/machines-stats?${query}`)
}
