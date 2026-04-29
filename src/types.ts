export type AssetStatus =
  | 'EN_STOCK'
  | 'AFFECTE'
  | 'EN_PANNE'
  | 'EN_REPARATION'
  | 'EN_SERVICE'
  | 'HORS_SERVICE'
// chchhchch
export type Asset = {
  id: number
  inventoryNumber: string
  serialNumber?: string
  serial_number?: string | null
  type: string
  brand: string
  model: string
  entryDate: string // ISO date
  warrantyMonths?: number
  warrantyStartDate?: string | null
  warrantyEndDate?: string | null
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

/** Réparation telle que renvoyée par l’API détail matériel (GET /api/assets/:id) */
export type RepairFromApi = {
  id: number
  incidentId: number
  workshopEntryDate: string
  action: string
  cost: number | null
  status: string
  outcome: string | null
  createdAt: string
  updatedAt: string
}

export type HistoryEvent = {
  id: number
  assetId: number
  type:
    | 'ASSET_CREATED'
    | 'ASSET_UPDATED'
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

/** Réponse de l’API GET /api/dashboard (backend) */
export type DashboardApiResponse = {
  simple_data: {
    totalMateriels: number
    enStock: number
    affectes: number
    reparationsEnCours: number
  }
  repartition_par_etat: Array<{ etat: string; libelle: string; count: number }>
  top_directions_pannes: Array<{ direction: string; count: number }>
  synthese_par_etat: Array<{ etat: string; libelle: string; count: number }>
  materiels_par_type: Array<{ type: string; count: number }>
}

/** Réponse de l’API GET /api/assets/:id (détail + historique + incidents) */
export type AssetDetailsApi = Asset & {
  history: HistoryEvent[]
  currentAssignment: Assignment | null
  incidentsWithRepairs: (Incident & { repairs: RepairFromApi[] })[]
  currentStatus: AssetStatus
}
