import type { AssetStatus } from '../types'

export function formatDate(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR')
}

export function assetStatusLabel(s: AssetStatus) {
  switch (s) {
    case 'EN_STOCK':
      return 'En Stock'
    case 'AFFECTE':
      return 'Affecté'
    case 'EN_PANNE':
      return 'En Panne'
    case 'EN_REPARATION':
      return 'Réparation'
    case 'EN_SERVICE':
      return 'En Service'
    case 'HORS_SERVICE':
      return 'Hors Service'
    default:
      return s
  }
}

