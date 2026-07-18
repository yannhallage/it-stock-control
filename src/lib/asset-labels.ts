import type { Asset, Assignment, AssignmentUser, Incident, Ref, ScreenLoan } from '../types'

export function getRefName(ref?: Ref | null): string {
  return ref?.name ?? '—'
}

export function getBrandName(asset?: Pick<Asset, 'brand'> | null): string {
  return getRefName(asset?.brand)
}

export function getTypeName(asset?: Pick<Asset, 'materialType'> | null): string {
  return getRefName(asset?.materialType)
}

export function getCategoryName(asset?: Pick<Asset, 'category'> | null): string {
  return getRefName(asset?.category)
}

export function getSupplierName(asset?: Pick<Asset, 'supplier'> | null): string {
  return getRefName(asset?.supplier)
}

export function getLocationName(asset?: Pick<Asset, 'location'> | null): string {
  return getRefName(asset?.location)
}

export function getSerialNumber(asset?: Pick<Asset, 'serialNumber'> | null): string {
  return asset?.serialNumber?.trim() || '—'
}

export function formatUserName(user?: AssignmentUser | null): string {
  if (!user) return '—'
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
  return full || user.email || '—'
}

export function getDepartmentName(
  entity?: Pick<Assignment | Incident | ScreenLoan, 'department'> | null,
): string {
  return getRefName(entity?.department)
}

export function formatBrandModel(asset?: Pick<Asset, 'brand' | 'model'> | null): string {
  if (!asset) return '—'
  return `${getBrandName(asset)} / ${asset.model}`
}
