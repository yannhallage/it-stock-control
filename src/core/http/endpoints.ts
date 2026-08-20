// function windowApiBaseUrl(): string | undefined {
//   if (typeof window === 'undefined') return undefined
//   return (window as Window & { __API_BASE_URL__?: string }).__API_BASE_URL__
// }

const API_BASE_URL =
  // import.meta.env.VITE_API_BASE_URL || windowApiBaseUrl() || 'https://assets-srv.oraclouds.com'
  'https://assets-srv.oraclouds.com'

export const ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
  },
  assets: {
    base: '/api/assets',
    inventorySummary: '/api/assets/inventory-summary',
    physicalInventory: (id: number) => `/api/assets/${id}/physical-inventory`,
  },
  suppliers: {
    base: '/api/suppliers',
  },
  materialTypes: {
    base: '/api/material-types',
  },
  departments: {
    base: '/api/departments',
  },
  categories: {
    base: '/api/categories',
  },
  brands: {
    base: '/api/brands',
  },
  employees: {
    base: '/api/employees',
  },
  locations: {
    base: '/api/locations',
  },
  maintenances: {
    base: '/api/maintenances',
  },
  attachments: {
    base: '/api/attachments',
  },
  movements: {
    base: '/api/movements',
  },
  assignments: {
    base: '/api/assignments',
  },
  incidents: {
    base: '/api/incidents',
  },
  workshop: {
    base: '/api/atelier/repairs',
  },
  screenLoans: {
    base: '/api/screen-loans',
  },
  impression: {
    assets: '/api/impression/printAssets',
    inventory: '/api/impression/printInventory',
    signaletic: '/api/impression/printSignaleticSheets',
    asset: '/api/impression/printAsset',
    assignments: '/api/impression/printAssigment',
    suppliers: '/api/impression/printSuppliers',
    incidents: '/api/impression/printIncidents',
    screenLoans: '/api/impression/printScreenLoans',
    screenLoan: '/api/impression/printScreenLoan',
  },
  dashboard: '/api/dashboard',
} as const

export function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
