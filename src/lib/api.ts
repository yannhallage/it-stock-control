import seed from './seed.json'
import type { Asset, Assignment, DashboardStats, HistoryEvent, Incident, Repair } from '../types'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

type Db = {
  assets: Asset[]
  assignments: Assignment[]
  incidents: Incident[]
  repairs: Repair[]
  history: HistoryEvent[]
}

type Seed = Db

function clone<T>(v: T): T {
  // structuredClone est dispo dans les navigateurs modernes (Vite)
  return structuredClone(v)
}

const db: Db = clone(seed as Seed)

function nowIso() {
  return new Date().toISOString()
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function nextId(items: Array<{ id: number }>) {
  return (items.reduce((m, it) => Math.max(m, it.id), 0) || 0) + 1
}

function parseUrl(path: string) {
  // base arbitraire pour supporter les URLs relatives
  return new URL(path, 'http://local')
}

function jsonBody(init?: RequestInit): any {
  const b = init?.body
  if (!b) return null
  if (typeof b === 'string') {
    try {
      return JSON.parse(b)
    } catch {
      return b
    }
  }
  return b
}

function activeAssignmentFor(assetId: number) {
  const actives = db.assignments.filter((a) => a.assetId === assetId && a.endDate === null)
  if (!actives.length) return null
  // s'il y en a plusieurs, on prend la plus récente par startDate
  return actives.slice().sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null
}

function computeDashboard(): DashboardStats {
  const countsByStatus: Record<string, number> = {}
  for (const a of db.assets) countsByStatus[a.status] = (countsByStatus[a.status] ?? 0) + 1

  const openIncidents = db.incidents.filter((i) => i.status === 'OUVERT')
  const byDept = new Map<string, number>()
  for (const i of openIncidents) byDept.set(i.department, (byDept.get(i.department) ?? 0) + 1)

  const topDepartmentsIncidents = Array.from(byDept.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([department, count]) => ({ department, count }))

  const repairsInProgress = db.repairs.filter((r) => r.status === 'EN_COURS').length

  return {
    countsByStatus,
    stockVsAssigned: {
      enStock: db.assets.filter((a) => a.status === 'EN_STOCK').length,
      affecte: db.assets.filter((a) => a.status === 'AFFECTE').length,
    },
    topDepartmentsIncidents,
    repairsInProgress,
  }
}

function assetDetails(assetId: number) {
  const asset = db.assets.find((a) => a.id === assetId)
  if (!asset) throw new ApiError('Matériel introuvable', 404, { assetId })

  const assignments = db.assignments
    .filter((a) => a.assetId === assetId)
    .slice()
    .sort((a, b) => b.startDate.localeCompare(a.startDate))

  const incidents = db.incidents
    .filter((i) => i.assetId === assetId)
    .slice()
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
    .map((i) => ({
      ...i,
      repairs: db.repairs
        .filter((r) => r.incidentId === i.id)
        .slice()
        .sort((a, b) => b.workshopIn.localeCompare(a.workshopIn)),
    }))

  const history = db.history
    .filter((h) => h.assetId === assetId)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return {
    ...asset,
    assignments,
    incidents,
    history,
    activeAssignment: activeAssignmentFor(assetId),
  }
}

function listAssets(url: URL) {
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const type = (url.searchParams.get('type') ?? '').trim()
  const status = (url.searchParams.get('status') ?? '').trim()
  const withParam = (url.searchParams.get('with') ?? '').trim()
  const withActive = withParam === 'activeAssignment'

  let items = db.assets.slice()
  if (type) items = items.filter((a) => a.type === type)
  if (status) items = items.filter((a) => a.status === status)
  if (q) {
    items = items.filter((a) => {
      const hay = `${a.inventoryNumber} ${a.brand} ${a.model} ${a.supplier} ${a.type}`.toLowerCase()
      return hay.includes(q)
    })
  }

  items.sort((a, b) => a.inventoryNumber.localeCompare(b.inventoryNumber))

  if (withActive) {
    return items.map((a) => ({ ...a, activeAssignment: activeAssignmentFor(a.id) }))
  }
  return items
}

function listIncidents(url: URL) {
  const status = (url.searchParams.get('status') ?? '').trim()
  const withAsset = (url.searchParams.get('with') ?? '').includes('asset')

  let items = db.incidents.slice()
  if (status) items = items.filter((i) => i.status === status)
  items.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))

  if (withAsset) {
    return items.map((i) => ({
      ...i,
      asset: db.assets.find((a) => a.id === i.assetId)!,
    }))
  }

  // on renvoie quand même "asset" (utile pour l'affichage), même si pas demandé
  return items.map((i) => ({
    ...i,
    asset: db.assets.find((a) => a.id === i.assetId)!,
  }))
}

function listRepairs(url: URL) {
  const status = (url.searchParams.get('status') ?? '').trim()
  const withIncident = (url.searchParams.get('with') ?? '').includes('incident')

  let items = db.repairs.slice()
  if (status) items = items.filter((r) => r.status === status)
  items.sort((a, b) => b.workshopIn.localeCompare(a.workshopIn))

  if (!withIncident) return items

  return items.map((r) => {
    const incident = db.incidents.find((i) => i.id === r.incidentId)
    if (!incident) throw new ApiError('Incident introuvable', 500, { repairId: r.id })
    const asset = db.assets.find((a) => a.id === incident.assetId)
    if (!asset) throw new ApiError('Matériel introuvable', 500, { repairId: r.id })
    return {
      ...r,
      incident: { ...incident, asset },
    }
  })
}

function setAssetStatus(asset: Asset, next: Asset['status']) {
  if (asset.status === next) return
  const prev = asset.status
  asset.status = next
  asset.updatedAt = nowIso()
  db.history.push({
    id: nextId(db.history),
    assetId: asset.id,
    type: 'STATUS_CHANGED',
    payload: { from: prev, to: next },
    createdAt: nowIso(),
  })
}

function pushHistory(assetId: number, type: HistoryEvent['type'], payload: Record<string, unknown>) {
  db.history.push({
    id: nextId(db.history),
    assetId,
    type,
    payload,
    createdAt: nowIso(),
  })
}

function handlePostAssets(init?: RequestInit) {
  const input = (jsonBody(init) ?? {}) as Partial<{
    inventoryNumber: string
    type: string
    brand: string
    model: string
    entryDate: string
    supplier: string
  }>

  if (!input.inventoryNumber || !input.type || !input.brand || !input.model || !input.entryDate || !input.supplier) {
    throw new ApiError('Champs manquants', 400, input)
  }
  if (db.assets.some((a) => a.inventoryNumber === input.inventoryNumber)) {
    throw new ApiError("Numéro d'inventaire déjà utilisé", 409, { inventoryNumber: input.inventoryNumber })
  }

  const asset: Asset = {
    id: nextId(db.assets),
    inventoryNumber: input.inventoryNumber,
    type: input.type,
    brand: input.brand,
    model: input.model,
    entryDate: input.entryDate,
    supplier: input.supplier,
    status: 'EN_STOCK',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  db.assets.push(asset)
  pushHistory(asset.id, 'ASSET_CREATED', { inventoryNumber: asset.inventoryNumber, status: asset.status })
  return asset
}

function handlePostAssetAssignment(assetId: number, init?: RequestInit) {
  const asset = db.assets.find((a) => a.id === assetId)
  if (!asset) throw new ApiError('Matériel introuvable', 404, { assetId })

  const input = (jsonBody(init) ?? {}) as Partial<{
    department: string
    user: string
    startDate: string
  }>
  if (!input.department || !input.user || !input.startDate) {
    throw new ApiError('Champs manquants', 400, input)
  }

  const prevActive = activeAssignmentFor(assetId)
  if (prevActive) {
    prevActive.endDate = input.startDate
    // on ne crée pas forcément un event dédié ici, le nouvel event suffit
  }

  const assignment: Assignment = {
    id: nextId(db.assignments),
    assetId,
    department: input.department,
    user: input.user,
    startDate: input.startDate,
    endDate: null,
    createdAt: nowIso(),
  }
  db.assignments.push(assignment)
  setAssetStatus(asset, 'AFFECTE')
  pushHistory(assetId, 'ASSIGNMENT_CREATED', {
    department: assignment.department,
    user: assignment.user,
    startDate: assignment.startDate,
  })
  return assignment
}

function handlePostEndAssignment(assignmentId: number) {
  const assignment = db.assignments.find((a) => a.id === assignmentId)
  if (!assignment) throw new ApiError('Affectation introuvable', 404, { assignmentId })
  if (assignment.endDate !== null) return { ok: true as const }

  assignment.endDate = todayIsoDate()
  const asset = db.assets.find((a) => a.id === assignment.assetId)
  if (asset) {
    setAssetStatus(asset, 'EN_STOCK')
    pushHistory(asset.id, 'ASSIGNMENT_ENDED', { assignmentId, endDate: assignment.endDate })
  }
  return { ok: true as const }
}

function handlePostAssetIncident(assetId: number, init?: RequestInit) {
  const asset = db.assets.find((a) => a.id === assetId)
  if (!asset) throw new ApiError('Matériel introuvable', 404, { assetId })

  const input = (jsonBody(init) ?? {}) as Partial<{
    department: string
    reportedAt: string
    description: string
  }>
  if (!input.department || !input.reportedAt || !input.description) {
    throw new ApiError('Champs manquants', 400, input)
  }

  const incident: Incident = {
    id: nextId(db.incidents),
    assetId,
    description: input.description,
    reportedAt: input.reportedAt,
    department: input.department,
    status: 'OUVERT',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  db.incidents.push(incident)
  setAssetStatus(asset, 'EN_PANNE')
  pushHistory(assetId, 'INCIDENT_REPORTED', {
    incidentId: incident.id,
    department: incident.department,
    reportedAt: incident.reportedAt,
  })
  return incident
}

function handlePostIncidentRepair(incidentId: number, init?: RequestInit) {
  const incident = db.incidents.find((i) => i.id === incidentId)
  if (!incident) throw new ApiError('Incident introuvable', 404, { incidentId })
  if (incident.status !== 'OUVERT') throw new ApiError('Incident déjà clos', 409, { incidentId })

  const asset = db.assets.find((a) => a.id === incident.assetId)
  if (!asset) throw new ApiError('Matériel introuvable', 500, { incidentId })

  const input = (jsonBody(init) ?? {}) as Partial<{
    action: string
    cost: number
    workshopIn: string
  }>
  if (!input.action || input.cost === undefined || input.workshopIn === undefined) {
    throw new ApiError('Champs manquants', 400, input)
  }

  const repair: Repair = {
    id: nextId(db.repairs),
    incidentId,
    action: input.action,
    cost: Number(input.cost || 0),
    workshopIn: input.workshopIn,
    workshopOut: null,
    status: 'EN_COURS',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  db.repairs.push(repair)
  setAssetStatus(asset, 'EN_REPARATION')
  pushHistory(asset.id, 'REPAIR_STARTED', { repairId: repair.id, workshopIn: repair.workshopIn, cost: repair.cost })
  return repair
}

function handlePostFinishRepair(repairId: number, init?: RequestInit) {
  const repair = db.repairs.find((r) => r.id === repairId)
  if (!repair) throw new ApiError('Réparation introuvable', 404, { repairId })

  const input = (jsonBody(init) ?? {}) as Partial<{
    workshopOut: string
    outcome: 'EN_SERVICE' | 'HORS_SERVICE'
  }>
  if (!input.workshopOut || !input.outcome) throw new ApiError('Champs manquants', 400, input)

  repair.workshopOut = input.workshopOut
  repair.status = 'TERMINE'
  repair.updatedAt = nowIso()

  const incident = db.incidents.find((i) => i.id === repair.incidentId)
  if (incident) {
    incident.status = 'CLOS'
    incident.updatedAt = nowIso()
  }

  const asset = incident ? db.assets.find((a) => a.id === incident.assetId) : null
  if (asset) {
    setAssetStatus(asset, input.outcome)
    pushHistory(asset.id, 'REPAIR_FINISHED', { repairId: repair.id, workshopOut: repair.workshopOut, outcome: input.outcome })
  }

  return repair
}

function handleDeleteAsset(assetId: number) {
  const idx = db.assets.findIndex((a) => a.id === assetId)
  if (idx === -1) throw new ApiError('Matériel introuvable', 404, { assetId })
  const incidentIds = db.incidents.filter((i) => i.assetId === assetId).map((i) => i.id)
  db.repairs = db.repairs.filter((r) => !incidentIds.includes(r.incidentId))
  db.incidents = db.incidents.filter((i) => i.assetId !== assetId)
  db.assignments = db.assignments.filter((a) => a.assetId !== assetId)
  db.history = db.history.filter((h) => h.assetId !== assetId)
  db.assets.splice(idx, 1)
  return undefined
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const url = parseUrl(path)
  const pathname = url.pathname

  try {
    // GET
    if (method === 'GET' && pathname === '/api/dashboard') return clone(computeDashboard()) as T
    if (method === 'GET' && pathname === '/api/assets') return clone(listAssets(url)) as T
    if (method === 'GET' && pathname === '/api/incidents') return clone(listIncidents(url)) as T
    if (method === 'GET' && pathname === '/api/repairs') return clone(listRepairs(url)) as T

    {
      const m = pathname.match(/^\/api\/assets\/(\d+)$/)
      if (method === 'GET' && m) return clone(assetDetails(Number(m[1]))) as T
      if (method === 'DELETE' && m) {
        handleDeleteAsset(Number(m[1]))
        return undefined as T
      }
    }

    // POST
    if (method === 'POST' && pathname === '/api/assets') return clone(handlePostAssets(init)) as T

    {
      const m = pathname.match(/^\/api\/assets\/(\d+)\/assignments$/)
      if (method === 'POST' && m) return clone(handlePostAssetAssignment(Number(m[1]), init)) as T
    }
    {
      const m = pathname.match(/^\/api\/assignments\/(\d+)\/end$/)
      if (method === 'POST' && m) return clone(handlePostEndAssignment(Number(m[1]))) as T
    }
    {
      const m = pathname.match(/^\/api\/assets\/(\d+)\/incidents$/)
      if (method === 'POST' && m) return clone(handlePostAssetIncident(Number(m[1]), init)) as T
    }
    {
      const m = pathname.match(/^\/api\/incidents\/(\d+)\/repairs$/)
      if (method === 'POST' && m) return clone(handlePostIncidentRepair(Number(m[1]), init)) as T
    }
    {
      const m = pathname.match(/^\/api\/repairs\/(\d+)\/finish$/)
      if (method === 'POST' && m) return clone(handlePostFinishRepair(Number(m[1]), init)) as T
    }

    throw new ApiError('Endpoint non implémenté (mode seed)', 404, { method, path })
  } catch (e: any) {
    if (e instanceof ApiError) throw e
    throw new ApiError(String(e?.message ?? e), 500, { method, path })
  }
}
