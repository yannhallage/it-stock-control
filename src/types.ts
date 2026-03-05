export type AssetStatus =
  | 'EN_STOCK'
  | 'AFFECTE'
  | 'EN_PANNE'
  | 'EN_REPARATION'
  | 'EN_SERVICE'
  | 'HORS_SERVICE'

export type Asset = {
  id: number
  inventoryNumber: string
  type: string
  brand: string
  model: string
  entryDate: string // ISO date
  supplier: string
  status: AssetStatus
  createdAt: string
  updatedAt: string
}

export type Assignment = {
  id: number
  assetId: number
  department: string
  /** API: string (legacy) ou { name: string } ou { names: string[] } */
  user: string | { name: string } | { names: string[] }
  startDate: string
  endDate: string | null
  createdAt: string
}

export type Incident = {
  id: number
  assetId: number
  description: string
  reportedAt: string
  department: string
  status: 'OUVERT' | 'CLOS'
  createdAt: string
  updatedAt: string
}

export type Repair = {
  id: number
  incidentId: number
  action: string
  cost: number
  workshopIn: string
  workshopOut: string | null
  status: 'EN_COURS' | 'TERMINE'
  createdAt: string
  updatedAt: string
}

export type HistoryEvent = {
  id: number
  assetId: number
  type:
    | 'ASSET_CREATED'
    | 'STATUS_CHANGED'
    | 'ASSIGNMENT_CREATED'
    | 'ASSIGNMENT_ENDED'
    | 'INCIDENT_REPORTED'
    | 'REPAIR_STARTED'
    | 'REPAIR_FINISHED'
  payload: Record<string, unknown>
  createdAt: string
}

export type DashboardStats = {
  countsByStatus: Record<string, number>
  stockVsAssigned: { enStock: number; affecte: number }
  topDepartmentsIncidents: Array<{ department: string; count: number }>
  repairsInProgress: number
}
