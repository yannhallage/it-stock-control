import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import type { StartRepairPayload } from '../../api/services/workshop.service'
import type { Asset, Incident } from '../../types'
import { Button, Input, Select, Textarea } from '../Ui'

type DrawerStartRepairProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  incidentChoices: Incident[]
  assetsById: Map<number, Asset>
  startRepair: (payload: StartRepairPayload) => Promise<unknown>
}

const ANIMATION_MS = 220

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const withErrors = error as { message?: unknown; errors?: unknown }
    if (Array.isArray(withErrors.errors)) {
      const entries = withErrors.errors.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      if (entries.length) return entries.join('\n')
    }
    if (typeof withErrors.message === 'string' && withErrors.message.trim()) return withErrors.message
  }

  if (error instanceof Error) {
    if (error.message.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(error.message) as { message?: unknown; errors?: unknown }
        if (Array.isArray(parsed.errors)) {
          const entries = parsed.errors.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          if (entries.length) return entries.join('\n')
        }
        if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message
      } catch {
        // Ignore parse errors and use default handling below.
      }
    }
    if (error.message.trim()) return error.message
  }

  return String(error || '')
}

export function DrawerStartRepair({
  isOpen,
  onClose,
  onSuccess,
  incidentChoices,
  assetsById,
  startRepair,
}: DrawerStartRepairProps) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)
  const [submitting, setSubmitting] = useState(false)
  const [incidentId, setIncidentId] = useState<number | ''>('')
  const [action, setAction] = useState('')
  const [repairBy, setRepairBy] = useState('')
  const [workshopIn, setWorkshopIn] = useState(new Date().toISOString().slice(0, 10))

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
    setIncidentId('')
    setAction('')
    setRepairBy('')
    setWorkshopIn(new Date().toISOString().slice(0, 10))
  }, [isOpen])

  useEffect(() => {
    if (!mounted) return
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [mounted, submitting, onClose])

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
    if (!incidentId) {
      toast.warning('Veuillez sélectionner un incident.')
      return
    }
    if (!repairBy.trim()) {
      toast.warning('Veuillez renseigner le nom de la personne ayant effectué la réparation.')
      return
    }
    setSubmitting(true)
    try {
      const normalizedAction = action.trim()
      await startRepair({
        incidentId: Number(incidentId),
        workshopEntryDate: workshopIn,
        technicianName: repairBy.trim(),
        action: normalizedAction || undefined,
      })
      toast.success('Réparation démarrée.')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = getErrorMessage(err)
      toast.error(msg || 'Erreur lors du démarrage de la réparation.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 min-h-screen min-h-[100dvh]">
      <button
        type="button"
        className={`absolute inset-0 min-h-screen min-h-[100dvh] bg-black/40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => {
          if (!submitting) onClose()
        }}
        aria-label="Fermer"
      />

      <aside
        className={`absolute inset-y-0 right-0 flex w-full min-h-0 max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-200 ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Démarrer une réparation"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">
              Démarrer une réparation (En Panne → En Réparation)
            </h3>
            <Button type="button" variant="default" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" onClick={onClose} disabled={submitting}>
              Fermer
            </Button>
          </div>

          <form className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Incident"
                value={incidentId}
                onChange={(e) => setIncidentId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Sélectionner…</option>
                {incidentChoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    #{i.id} — {assetsById.get(i.assetId)?.inventoryNumber ?? `#${i.assetId}`} — {i.department}
                  </option>
                ))}
              </Select>
              <Input
                label="Date entrée atelier"
                type="date"
                value={workshopIn}
                onChange={(e) => setWorkshopIn(e.target.value)}
              />
              <Input
                label="Nom de la personne ayant effectué la réparation"
                value={repairBy}
                onChange={(e) => setRepairBy(e.target.value)}
              />
              <div className="hidden md:block" />
              <div className="md:col-span-2">
                <Textarea
                  label="Action menée"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="mt-auto flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <Button type="button" variant="default" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" onClick={onClose} disabled={submitting}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" disabled={submitting}>
                {submitting ? 'Envoi…' : 'Passer en réparation'}
              </Button>
            </div>
          </form>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
