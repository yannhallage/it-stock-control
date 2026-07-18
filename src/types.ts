export type AssetStatus =
  | 'EN_STOCK_NON_AFFECTE'
  | 'AFFECTE'
  | 'EN_PRET'
  | 'EN_PANNE'
  | 'EN_REPARATION'
  | 'EN_SERVICE'
  | 'HORS_SERVICE'

export type Ref = {
  id: number
  name: string
}

export type AssignmentUser = {
  id: string
  firstName: string
  lastName: string
  email: string
}

export type Asset = {
  id: number
  inventoryNumber: string
  serialNumber?: string | null
  model: string
  categoryId: number
  materialTypeId: number
  brandId: number
  supplierId?: number | null
  locationId?: number | null
  entryDate: string
  purchasePrice?: number | string | null
  warrantyStartDate?: string | null
  warrantyEndDate?: string | null
  status: AssetStatus
  category?: Ref
  materialType?: Ref
  brand?: Ref
  supplier?: Ref | null
  location?: (Ref & { building?: string | null; floor?: string | null; room?: string | null }) | null
  createdAt: string
  updatedAt: string
}

export type Assignment = {
  id: number
  assetId: number
  userId: string
  departmentId: number
  user?: AssignmentUser
  department?: Ref
  startDate: string
  endDate: string | null
  note?: string | null
  createdAt: string
  asset?: Pick<Asset, 'id' | 'inventoryNumber' | 'serialNumber' | 'model' | 'status'> & {
    brand?: Ref
    materialType?: Ref
    category?: Ref
  }
}

export type Incident = {
  id: number
  assetId: number
  departmentId: number
  department?: Ref
  description: string
  reportedAt: string
  status: 'OUVERT' | 'CLOS'
  createdAt: string
  updatedAt: string
  asset?: Pick<Asset, 'id' | 'inventoryNumber' | 'serialNumber' | 'model' | 'status'> & {
    brand?: Ref
    materialType?: Ref
    category?: Ref
  }
}

export type Repair = {
  id: number
  assetId?: number
  incidentId: number | null
  action: string
  cost: number
  workshopIn: string
  workshopOut: string | null
  workshopEntryDate?: string
  workshopExitDate?: string | null
  technicianName?: string | null
  status: 'EN_COURS' | 'TERMINE'
  outcome?: AssetStatus | null
  createdAt: string
  updatedAt: string
  incident?: Incident
  asset?: Pick<Asset, 'id' | 'inventoryNumber' | 'serialNumber' | 'model' | 'status'> & {
    brand?: Ref
    materialType?: Ref
    category?: Ref
  }
}

export type RepairFromApi = {
  id: number
  assetId?: number
  incidentId: number | null
  workshopEntryDate: string
  workshopExitDate: string | null
  workshopOut?: string | null
  action: string
  cost: number | null
  status: Repair['status']
  outcome: AssetStatus | null
  technicianName?: string | null
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
    | 'MAINTENANCE_CREATED'
    | 'LOCATION_CHANGED'
  payload: Record<string, unknown>
  createdAt: string
}

export type DashboardStats = {
  countsByStatus: Record<string, number>
  stockVsAssigned: { enStock: number; affecte: number }
  topDepartmentsIncidents: Array<{ department: string; count: number }>
  repairsInProgress: number
}

export type ScreenLoanStatus = 'RETURNED' | 'NOT_RETURNED'

export type ScreenLoan = {
  id: number
  assetId: number
  borrowerFirstName: string
  borrowerLastName: string
  departmentId?: number | null
  department?: Ref | null
  loanDate: string
  expectedReturnDate: string
  returnedAt: string | null
  note?: string | null
  createdAt: string
  asset?: Pick<Asset, 'id' | 'inventoryNumber' | 'serialNumber' | 'model' | 'status'> & {
    brand?: Ref
    materialType?: Ref
    category?: Ref
  }
}

export type MaintenanceStatus = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'

export type Maintenance = {
  id: number
  assetId: number
  title: string
  description?: string | null
  scheduledDate: string
  completedDate?: string | null
  technician?: string | null
  cost?: number | string | null
  status: MaintenanceStatus
  createdAt: string
  updatedAt: string
  asset?: Pick<Asset, 'id' | 'inventoryNumber' | 'model' | 'status'> & {
    brand?: Ref
    materialType?: Ref
  }
}

export type AttachmentType = 'PHOTO' | 'FACTURE' | 'GARANTIE' | 'MANUEL' | 'AUTRE'

export type Attachment = {
  id: number
  assetId: number
  type: AttachmentType
  fileName: string
  filePath: string
  uploadedAt: string
}

export type MovementType = 'ENTREE' | 'SORTIE' | 'TRANSFERT'

export type AssetMovement = {
  id: number
  assetId: number
  fromLocationId?: number | null
  toLocationId?: number | null
  fromLocation?: Ref | null
  toLocation?: Ref | null
  movementType: MovementType
  movedAt: string
  note?: string | null
  createdAt: string
  asset?: Pick<Asset, 'id' | 'inventoryNumber' | 'model' | 'status'>
}

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

export type MachinesStatsGranularity = 'week' | 'month' | 'year'

export type MachinesStatsPoint = {
  periodStart: string
  assetsCreated: number
  assignmentsCreated: number
  loansCreated: number
  loansReturned: number
  repairsStarted: number
  repairsFinished: number
  totalActivity: number
}

export type AssetDetailsApi = Asset & {
  history: HistoryEvent[]
  currentAssignment: Assignment | null
  incidentsWithRepairs: (Incident & { repairs: RepairFromApi[] })[]
  currentStatus: AssetStatus
}
