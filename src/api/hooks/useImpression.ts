import { useCallback, useState } from 'react'
import {
  downloadAssignmentPdfByIdService,
  downloadAssetsPdfService,
  downloadAssignmentsPdfService,
  downloadIncidentsPdfService,
  downloadSuppliersPdfService,
} from '../services/impression.service'

type DownloadKind = 'assets' | 'assignments' | 'suppliers' | 'incidents'

const fileNameByKind: Record<DownloadKind, string> = {
  assets: 'assets-report.pdf',
  assignments: 'assignments-report.pdf',
  suppliers: 'suppliers-report.pdf',
  incidents: 'incidents-report.pdf',
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

export function useImpression() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadReport = useCallback(async (kind: DownloadKind) => {
    setLoading(true)
    setError(null)
    try {
      const blob =
        kind === 'assets'
          ? await downloadAssetsPdfService()
          : kind === 'assignments'
            ? await downloadAssignmentsPdfService()
            : kind === 'suppliers'
              ? await downloadSuppliersPdfService()
              : await downloadIncidentsPdfService()

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

  return { downloadReport, downloadAssignmentReport, loading, error }
}
