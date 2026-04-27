import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Supplier } from '../../api/services/suppliers.service'
import type { MaterialType } from '../../api/services/material-types.service'
import type { AssetCreateFormState } from './DrawerAssets'
import { Button, Input, Select } from '../Ui'

type DrawerAssetsUpdateProps = {
  isOpen: boolean
  onClose: () => void
  form: AssetCreateFormState
  setForm: Dispatch<SetStateAction<AssetCreateFormState>>
  materialTypes: MaterialType[]
  suppliers: Supplier[]
  loading: boolean
  onSubmit: (e: FormEvent) => void
}

const ANIMATION_MS = 220

export function DrawerAssetsUpdate({
  isOpen,
  onClose,
  form,
  setForm,
  materialTypes,
  suppliers,
  loading,
  onSubmit,
}: DrawerAssetsUpdateProps) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)

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
        className={`absolute inset-y-0 right-0 flex w-full min-h-0 min-w-0 max-w-xl flex-col overflow-x-hidden border-l border-gray-200 bg-white shadow-2xl transition-transform duration-200 ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Modifier le matériel"
      >
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <h3 className="min-w-0 truncate text-base font-semibold text-gray-900">Modifier le matériel</h3>
            <Button type="button" variant="default" className="shrink-0 cursor-pointer" onClick={onClose} disabled={loading}>
              Fermer
            </Button>
          </div>

          <form className="flex min-h-0 min-w-0 flex-1 flex-col" onSubmit={onSubmit}>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-5">
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:[&>*]:min-w-0">
                <Input
                  label="Numéro d'inventaire"
                  value={form.inventoryNumber}
                  onChange={(e) => setForm({ ...form, inventoryNumber: e.target.value })}
                  className="font-mono"
                />
                <Select
                  label="Type (PC, Imprimante, etc.)"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="">Sélectionner un type</option>
                  {materialTypes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Marque"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
                <Input
                  label="Numéro de série du matériel"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                />
                <Input
                  label="Modèle"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
                <Input
                  label="Date d'entrée"
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                />
                <Input
                  label="Délai de garantie (mois)"
                  type="number"
                  min={1}
                  value={form.warrantyMonths}
                  onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })}
                />
                <Select
                  label="Fournisseur"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 py-4">
              <Button type="button" variant="default" className="cursor-pointer" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" className="cursor-pointer" disabled={loading}>
                Enregistrer
              </Button>
            </div>
          </form>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
