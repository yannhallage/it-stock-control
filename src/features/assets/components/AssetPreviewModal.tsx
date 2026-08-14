import type React from 'react'
import { Button, Modal, StatusBadge } from '@shared/ui'
import {
  getBrandName,
  getDepartmentName,
  getSerialNumber,
  getSupplierName,
  getTypeName,
} from '@shared/utils/asset-labels'
import { formatDate } from '@shared/utils/format'
import type { AssetDetailsApi } from '@core/models'
import { assignmentEmployeeLabel, warrantyLabel } from '../utils/asset-list'

function DetailItem({
  label,
  children,
}: React.PropsWithChildren<{
  label: string
}>) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900">{children || '—'}</div>
    </div>
  )
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton-block rounded ${className}`} aria-hidden="true" />
}

function AssetPreviewSkeleton() {
  return (
    <div className="space-y-5" aria-label="Chargement du détail du matériel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[220px] flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-6 w-56 max-w-full" />
          <SkeletonBlock className="h-3 w-36" />
        </div>
        <SkeletonBlock className="h-6 w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <SkeletonBlock className="h-4 w-40" />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AssetPreviewModal({
  open,
  onClose,
  asset,
  loading,
  error,
}: {
  open: boolean
  onClose: () => void
  asset: AssetDetailsApi | null
  loading: boolean
  error: string | null
}) {
  const assignment = asset?.currentAssignment ?? null
  const assignmentUsers = assignment ? assignmentEmployeeLabel(assignment) : ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={asset ? `Aperçu ${asset.inventoryNumber}` : 'Aperçu du matériel'}
      closeOnBackdrop={!loading}
      footer={
        <Button
          type="button"
          variant="default"
          className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
          onClick={onClose}
          disabled={loading}
        >
          Fermer
        </Button>
      }
    >
      {loading ? (
        <AssetPreviewSkeleton />
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : asset ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-gray-500">{getTypeName(asset)}</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {getBrandName(asset)} {asset.model}
              </div>
              <div className="mt-1 text-xs text-gray-500">Inventaire {asset.inventoryNumber}</div>
            </div>
            <StatusBadge status={asset.currentStatus ?? asset.status} />
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <DetailItem label="N° série">{getSerialNumber(asset)}</DetailItem>
            <DetailItem label="Fournisseur">{getSupplierName(asset)}</DetailItem>
            <DetailItem label="Date d'entrée">{formatDate(asset.entryDate) || '—'}</DetailItem>
            <DetailItem label="Date d'ajout">{formatDate(asset.createdAt) || '—'}</DetailItem>
            <DetailItem label="Garantie">{warrantyLabel(asset)}</DetailItem>
            <DetailItem label="Mise à jour">{formatDate(asset.updatedAt) || '—'}</DetailItem>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="text-sm font-semibold text-gray-900">Affectation actuelle</div>
            {assignment ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Direction / service">{getDepartmentName(assignment)}</DetailItem>
                <DetailItem label="Personne(s) assignée(s)">{assignmentUsers || '—'}</DetailItem>
                <DetailItem label="Date d'affectation">{formatDate(assignment.startDate) || '—'}</DetailItem>
              </div>
            ) : (
              <div className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Aucune affectation active.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-6 text-sm text-gray-600">Aucun matériel sélectionné.</div>
      )}
    </Modal>
  )
}
