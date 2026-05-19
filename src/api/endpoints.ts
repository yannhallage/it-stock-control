function windowApiBaseUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Window & { __API_BASE_URL__?: string }).__API_BASE_URL__
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || windowApiBaseUrl() || 'http://localhost:3000'

export const ENDPOINTS = {
  auth: {
    // Correspond à @Controller('auth') + @Post('login')
    login: '/api/auth/login',
  },
  assets: {
    // Routing du module de gestion des stocks (assets)
    // Correspond à app.use('/api/assets', stocksModule.router);
    base: '/api/assets',
  },
  suppliers: {
    // Routing du module de gestion des fournisseurs
    // Correspond à app.use('/api/suppliers', suppliersModule.router);
    base: '/api/suppliers',
  },
  materialTypes: {
    // Routing du module de gestion des types de matériel
    // Correspond à app.use('/api/material-types', materialTypesModule.router);
    base: '/api/material-types',
  },
  assignments: {
    // Routing du module des affectations
    // Correspond à app.use('/api', assignmentsModule.router) avec préfixe /assignments
    base: '/api/assignments',
  },
  incidents: {
    // Routing du module des incidents (pannes)
    base: '/api/incidents',
  },
  workshop: {
    // Atelier : réparations
    base: '/api/atelier/repairs',
  },
  screenLoans: {
    // Gestion des emprunts de matériel
    base: '/api/screen-loans',
  },
  impression: {
    // Impression des rapports PDF
    assets: '/api/impression/printAssets',
    assignments: '/api/impression/printAssigment',
    suppliers: '/api/impression/printSuppliers',
    incidents: '/api/impression/printIncidents',
  },
  dashboard: '/api/dashboard',
} as const


export function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export type EndpointPath = {
  [K in keyof typeof ENDPOINTS]: (typeof ENDPOINTS)[K][keyof (typeof ENDPOINTS)[K]]
}[keyof typeof ENDPOINTS]

