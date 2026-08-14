import { useEffect, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { Button, Input, Select, Table } from '@shared/ui'
import { errorMessageFromUnknown } from '@shared/utils/errors'
import { formatDate } from '@shared/utils/format'
import {
  createAttachmentService,
  deleteAttachmentService,
  listAttachmentsService,
} from '../services/attachments.service'
import type { Attachment, AttachmentType } from '@core/models'

const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  PHOTO: 'Photo',
  FACTURE: 'Facture',
  GARANTIE: 'Garantie',
  MANUEL: 'Manuel',
  AUTRE: 'Autre',
}

const ATTACHMENT_TYPES: AttachmentType[] = ['PHOTO', 'FACTURE', 'GARANTIE', 'MANUEL', 'AUTRE']

type AssetAttachmentsPanelProps = {
  assetId: number
}

export function AssetAttachmentsPanel({ assetId }: AssetAttachmentsPanelProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState<AttachmentType>('PHOTO')
  const [fileName, setFileName] = useState('')
  const [filePath, setFilePath] = useState('')

  const loadAttachments = () => {
    setLoading(true)
    setError(null)
    listAttachmentsService({ assetId })
      .then(setItems)
      .catch((e) => {
        const msg = errorMessageFromUnknown(e, 'Erreur lors du chargement des pièces jointes.')
        setError(msg)
        toast.error(msg)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open) {
      loadAttachments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assetId])

  const resetForm = () => {
    setType('PHOTO')
    setFileName('')
    setFilePath('')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!fileName.trim()) {
      toast.warning('Le nom du fichier est obligatoire.')
      return
    }
    if (!filePath.trim()) {
      toast.warning('Le chemin du fichier est obligatoire.')
      return
    }

    setSubmitting(true)
    try {
      const created = await createAttachmentService({
        assetId,
        type,
        fileName: fileName.trim(),
        filePath: filePath.trim(),
      })
      setItems((prev) => [...prev, created])
      toast.success('Pièce jointe ajoutée.')
      resetForm()
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e, "Erreur lors de l'ajout de la pièce jointe.")
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette pièce jointe ?')) return

    setError(null)
    setSubmitting(true)
    try {
      await deleteAttachmentService(id)
      setItems((prev) => prev.filter((a) => a.id !== id))
      toast.success('Pièce jointe supprimée.')
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e, 'Erreur lors de la suppression de la pièce jointe.')
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const busy = loading || submitting

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-gray-900 sm:px-5">
        Pièces jointes {items.length > 0 && open ? `(${items.length})` : ''}
      </summary>
      <div className="border-t border-gray-100 p-4 sm:p-5">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="mb-6 grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as AttachmentType)}
            disabled={busy}
          >
            {ATTACHMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ATTACHMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <Input
            label="Nom du fichier"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Ex. facture-2024.pdf"
            disabled={busy}
          />
          <div className="sm:col-span-2">
            <Input
              label="Chemin du fichier"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="Ex. /uploads/assets/123/facture.pdf"
              disabled={busy}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={busy}
              className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            >
              Ajouter
            </Button>
          </div>
        </form>

        <Table columns={['Type', 'Fichier', 'Chemin', 'Date', 'Actions']}>
          {items.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {ATTACHMENT_TYPE_LABELS[a.type]}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{a.fileName}</td>
              <td className="px-4 py-3 text-xs text-gray-600 break-all">{a.filePath}</td>
              <td className="px-4 py-3 text-gray-600">{formatDate(a.uploadedAt)}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="rounded px-2 py-1 text-xs text-red-600 cursor-pointer hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
                  disabled={busy}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                {loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : (
                  'Aucune pièce jointe pour ce matériel.'
                )}
              </td>
            </tr>
          )}
        </Table>
      </div>
    </details>
  )
}
