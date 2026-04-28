import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { useIncidents } from '../../api/hooks/useIncidents'
import { Button, Input, Textarea } from '../Ui'

type IncidentDrawerProps = {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  assetId: number | null
  inventoryNumber: string
  materialName: string
  department: string
  userDisplay: string
}

const ANIMATION_MS = 220

export function IncidentDrawer({
  isOpen,
  onClose,
  onCreated,
  assetId,
  inventoryNumber,
  materialName,
  department,
  userDisplay,
}: IncidentDrawerProps) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)
  const [description, setDescription] = useState('')
  const [reportedAt, setReportedAt] = useState(new Date().toISOString().slice(0, 10))
  const { createIncidentForAsset, loading } = useIncidents()

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      const id = window.setTimeout(() => setVisible(true), 10)
      return () => window.clearTimeout(id)
    }
    setVisible(false)
    const id = window.setTimeout(() => setMounted(false), ANIMATION_MS)
    return () => window.clearTimeout(id)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setDescription('')
    setReportedAt(new Date().toISOString().slice(0, 10))
  }, [isOpen, assetId])

  useEffect(() => {
    if (!mounted) return
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [mounted, loading, onClose])

  useEffect(() => {
    if (!mounted) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mounted])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!assetId) {
      toast.warning('Matériel introuvable pour cette affectation.')
      return
    }
    if (!description.trim()) {
      toast.warning('Veuillez renseigner la description de la panne.')
      return
    }
    try {
      await createIncidentForAsset(assetId, {
        department,
        reportedAt,
        description: description.trim(),
      })
      toast.success('Panne enregistrée avec succès.')
      onCreated()
      onClose()
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err)
      toast.error(msg || "Erreur lors de l'enregistrement de la panne.")
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 min-h-screen min-h-[100dvh]">
      <button
        type="button"
        className={`absolute inset-0 min-h-screen min-h-[100dvh] bg-black/40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => {
          if (!loading) onClose()
        }}
        aria-label="Fermer"
      />

      <aside
        className={`absolute inset-y-0 right-0 flex w-full min-h-0 max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-200 ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Déclarer une panne"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">Déclarer une panne</h3>
            <Button type="button" variant="default" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" onClick={onClose} disabled={loading}>
              Fermer
            </Button>
          </div>

          <form className="flex h-full flex-col gap-4 overflow-y-auto p-5" onSubmit={handleSubmit}>
            <Input label="N° inventaire" value={inventoryNumber} readOnly />
            <Input label="Matériel" value={materialName} readOnly />
            <Input label="Direction" value={department} readOnly />
            <Input label="Utilisateur(s)" value={userDisplay} readOnly />
            <Input
              label="Date de signalement"
              type="date"
              value={reportedAt}
              onChange={(e) => setReportedAt(e.target.value)}
              required
            />
            <Textarea
              label="Description du problème"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Décrivez la panne constatée..."
              required
            />

            <div className="mt-auto flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <Button type="button" variant="default" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" disabled={loading}>
                {loading ? 'Enregistrement…' : 'Enregistrer la panne'}
              </Button>
            </div>
          </form>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
