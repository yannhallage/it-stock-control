const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || (window as any).__API_BASE_URL__ || 'http://localhost:3000'

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
} as const


export function buildUrl(path: string): string {
  // Si le backend expose ses routes sous /api, adapter ici:
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export type EndpointPath = {
  [K in keyof typeof ENDPOINTS]: (typeof ENDPOINTS)[K][keyof (typeof ENDPOINTS)[K]]
}[keyof typeof ENDPOINTS]

