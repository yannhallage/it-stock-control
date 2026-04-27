import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { useIncidents } from '../../api/hooks/useIncidents'
import type { Asset } from '../../types'
import { Button, Input, Select, Textarea } from '../Ui'

type ReportIncidentDrawerProps = {
  isOpen: boolean
  onClose: () => void
  assets: Asset[]
  onCreated: () => void
}

const ANIMATION_MS = 220

export function ReportIncidentDrawer({ isOpen, onClose, assets, onCreated }: ReportIncidentDrawerProps) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)
  const [assetId, setAssetId] = useState<number | ''>('')
  const [department, setDepartment] = useState('')
  const [reportedAt, setReportedAt] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
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
    setAssetId('')
    setDepartment('')
    setReportedAt(new Date().toISOString().slice(0, 10))
    setDescription('')
  }, [isOpen])

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
      toast.warning('Veuillez sélectionner un matériel.')
      return
    }
    try {
      await createIncidentForAsset(Number(assetId), { department, reportedAt, description })
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
        aria-label="Signaler un problème"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">Signaler un problème</h3>
            <Button type="button" variant="default" className="cursor-pointer" onClick={onClose} disabled={loading}>
              Fermer
            </Button>
          </div>

          <form className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Matériel"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Sélectionner…</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.inventoryNumber} — {a.type} — {a.brand} {a.model}
                  </option>
                ))}
              </Select>
              <Input
                label="Direction concernée"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
              <Input
                label="Date de signalement"
                type="date"
                value={reportedAt}
                onChange={(e) => setReportedAt(e.target.value)}
              />
              <div className="hidden md:block" />
              <div className="md:col-span-2">
                <Textarea
                  label="Description du problème"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Lorsqu'une panne est signalée, l'état du matériel passe automatiquement à <b>En Panne</b>.
            </p>

            <div className="mt-auto flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <Button type="button" variant="default" className="cursor-pointer" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" className="cursor-pointer" disabled={loading}>
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
