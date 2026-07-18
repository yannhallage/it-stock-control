import { useCallback, useState } from 'react'
import {
  downloadAssetPdfByInventoryNumberService,
  downloadAssignmentPdfByIdService,
  downloadAssetsPdfService,
  downloadAssignmentsPdfService,
  downloadIncidentsPdfService,
  downloadInventoryPdfService,
  downloadScreenLoanPdfByIdService,
  downloadScreenLoansPdfService,
  downloadSignaleticPdfService,
  downloadSuppliersPdfService,
  type AssetsPdfFilters,
  type InventoryPdfFilters,
} from '../services/impression.service'

type DownloadKind = 'assets' | 'assignments' | 'suppliers' | 'incidents' | 'screenLoans'

const fileNameByKind: Record<DownloadKind, string> = {
  assets: 'assets-report.pdf',
  assignments: 'assignments-report.pdf',
  suppliers: 'suppliers-report.pdf',
  incidents: 'incidents-report.pdf',
  screenLoans: 'screen-loans-report.pdf',
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function safeFileNameSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function useImpression() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadReport = useCallback(async (kind: DownloadKind, filters?: AssetsPdfFilters) => {
    setLoading(true)
    setError(null)
    try {
      const blob =
        kind === 'assets'
          ? await downloadAssetsPdfService(filters)
          : kind === 'assignments'
            ? await downloadAssignmentsPdfService()
            : kind === 'suppliers'
              ? await downloadSuppliersPdfService()
              : kind === 'incidents'
                ? await downloadIncidentsPdfService()
                : await downloadScreenLoansPdfService()

      saveBlob(blob, fileNameByKind[kind])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors du téléchargement du rapport PDF."
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const downloadAssignmentReport = useCallback(async (assignmentId: number) => {
    setLoading(true)
    setError(null)
    try {
      const blob = await downloadAssignmentPdfByIdService(assignmentId)
      saveBlob(blob, fileNameByKind.assignments)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors du téléchargement du rapport PDF."
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const downloadAssetReport = useCallback(async (inventoryNumber: string) => {
    setLoading(true)
    setError(null)
    try {
      const blob = await downloadAssetPdfByInventoryNumberService(inventoryNumber)
      saveBlob(blob, `materiel-${safeFileNameSegment(inventoryNumber)}.pdf`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors du tÃ©lÃ©chargement du rapport PDF."
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const downloadScreenLoanReport = useCallback(async (loanId: number) => {
    setLoading(true)
    setError(null)
    try {
      const blob = await downloadScreenLoanPdfByIdService(loanId)
      saveBlob(blob, `emprunt-${loanId}.pdf`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors du tÃ©lÃ©chargement du rapport PDF."
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const downloadInventoryReport = useCallback(async (filters?: InventoryPdfFilters) => {
    setLoading(true)
    setError(null)
    try {
      const blob = await downloadInventoryPdfService(filters)
      saveBlob(blob, 'inventaire-parc.pdf')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors du téléchargement du rapport inventaire."
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const downloadSignaleticReport = useCallback(async (filters?: InventoryPdfFilters) => {
    setLoading(true)
    setError(null)
    try {
      const blob = await downloadSignaleticPdfService(filters)
      saveBlob(blob, 'fiches-signaletiques.pdf')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur lors du téléchargement des fiches signalétiques."
      setError(message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    downloadReport,
    downloadAssignmentReport,
    downloadAssetReport,
    downloadScreenLoanReport,
    downloadInventoryReport,
    downloadSignaleticReport,
    loading,
    error,
  }
}
