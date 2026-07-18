import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { useDepartments } from '../../api/hooks/useDepartments'
import type { CreateScreenLoanPayload } from '../../api/services/screen-loans.service'
import { formatBrandModel } from '../../lib/asset-labels'
import type { Asset } from '../../types'
import { Button, Input, Select, Textarea } from '../Ui'

type DrawerScreenLoanProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void | Promise<void>
  assets: Asset[]
  activeLoanAssetIds: Set<number>
  createScreenLoan: (payload: CreateScreenLoanPayload) => Promise<unknown>
  initialAssetId?: number | ''
}

const ANIMATION_MS = 220

function assetLabel(asset: Asset) {
  return `${asset.inventoryNumber} - ${formatBrandModel(asset)}`
}

export function DrawerScreenLoan({
  isOpen,
  onClose,
  onSuccess,
  assets,
  activeLoanAssetIds,
  createScreenLoan,
  initialAssetId = '',
}: DrawerScreenLoanProps) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)
  const [submitting, setSubmitting] = useState(false)
  const [assetId, setAssetId] = useState<number | ''>('')
  const [borrowerLastName, setBorrowerLastName] = useState('')
  const [borrowerFirstName, setBorrowerFirstName] = useState('')
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [loanDate, setLoanDate] = useState(new Date().toISOString().slice(0, 10))
  const [expectedReturnDate, setExpectedReturnDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])
  const { fetchDepartments } = useDepartments()

  const availableAssets = useMemo(
    () =>
      assets
        .filter((asset) => asset.status === 'EN_STOCK_NON_AFFECTE')
        .filter((asset) => !activeLoanAssetIds.has(asset.id))
        .slice()
        .sort((a, b) => a.inventoryNumber.localeCompare(b.inventoryNumber, 'fr', { numeric: true })),
    [activeLoanAssetIds, assets],
  )

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
    fetchDepartments()
      .then(setDepartments)
      .catch(() => {
        toast.error('Erreur lors du chargement des directions.')
      })
  }, [fetchDepartments, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const selectedAssetId =
      initialAssetId && availableAssets.some((asset) => asset.id === initialAssetId) ? initialAssetId : ''
    setAssetId(selectedAssetId)
    setBorrowerLastName('')
    setBorrowerFirstName('')
    setDepartmentId('')
    const today = new Date().toISOString().slice(0, 10)
    setLoanDate(today)
    setExpectedReturnDate(today)
    setNote('')
  }, [availableAssets, initialAssetId, isOpen])

  useEffect(() => {
    if (!mounted) return
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [mounted, onClose, submitting])

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
    if (!borrowerLastName.trim()) {
      toast.warning("Veuillez renseigner le nom de l'emprunteur.")
      return
    }
    if (!borrowerFirstName.trim()) {
      toast.warning("Veuillez renseigner le prénom de l'emprunteur.")
      return
    }
    if (!loanDate || !expectedReturnDate) {
      toast.warning('Veuillez renseigner les dates de prêt et de retour prévu.')
      return
    }
    if (new Date(expectedReturnDate).getTime() < new Date(loanDate).getTime()) {
      toast.warning('La date prévue de retour ne peut pas être antérieure à la date de prêt.')
      return
    }

    setSubmitting(true)
    try {
      await createScreenLoan({
        assetId: Number(assetId),
        borrowerLastName: borrowerLastName.trim(),
        borrowerFirstName: borrowerFirstName.trim(),
        departmentId: departmentId ? Number(departmentId) : undefined,
        loanDate,
        expectedReturnDate,
        note: note.trim() || undefined,
      })
      toast.success('Emprunt de matériel enregistré.')
      await onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || "Erreur lors de l'enregistrement de l'emprunt.")
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
        aria-label="Enregistrer un emprunt de matériel"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">Enregistrer un emprunt de matériel</h3>
            <Button
              type="button"
              variant="default"
              className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
              onClick={onClose}
              disabled={submitting}
            >
              Fermer
            </Button>
          </div>

          <form className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Select
                  label="Matériel"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
                  disabled={!availableAssets.length || submitting}
                >
                  <option value="">Sélectionner un matériel...</option>
                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {assetLabel(asset)}
                    </option>
                  ))}
                </Select>
                {!availableAssets.length ? (
                  <div className="mt-1 text-xs text-amber-700">
                    Aucun matériel disponible pour un nouvel emprunt.
                  </div>
                ) : null}
              </div>
              <Input
                label="Nom de l'emprunteur"
                value={borrowerLastName}
                onChange={(e) => setBorrowerLastName(e.target.value)}
                disabled={submitting}
              />
              <Input
                label="Prénom de l'emprunteur"
                value={borrowerFirstName}
                onChange={(e) => setBorrowerFirstName(e.target.value)}
                disabled={submitting}
              />
              <Select
                label="Direction / service (optionnel)"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                disabled={submitting}
              >
                <option value="">Aucune direction</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Date de prêt"
                type="date"
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
                disabled={submitting}
              />
              <Input
                label="Date prévue de retour"
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                disabled={submitting}
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="mt-auto flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <Button
                type="button"
                variant="default"
                className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                onClick={onClose}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                disabled={submitting || !availableAssets.length}
              >
                {submitting ? 'Envoi...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
