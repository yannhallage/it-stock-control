import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Brand } from '../../api/services/brands.service'
import type { Category } from '../../api/services/categories.service'
import type { Location } from '../../api/services/locations.service'
import type { Supplier } from '../../api/services/suppliers.service'
import type { MaterialType } from '../../api/services/material-types.service'
import { Button, Input, Select } from '../Ui'

export type AssetCreateFormState = {
  inventoryNumber: string
  serialNumber: string
  categoryId: number | ''
  materialTypeId: number | ''
  brandId: number | ''
  supplierId: number | ''
  locationId: number | ''
  model: string
  entryDate: string
  warrantyMonths: string
}

type DrawerAssetsProps = {
  isOpen: boolean
  onClose: () => void
  form: AssetCreateFormState
  setForm: Dispatch<SetStateAction<AssetCreateFormState>>
  categories: Category[]
  materialTypes: MaterialType[]
  brands: Brand[]
  suppliers: Supplier[]
  locations: Location[]
  loading: boolean
  onSubmit: (e: FormEvent) => void
  nextInventoryForMaterialTypeId: (materialTypeId: number) => string
}

const ANIMATION_MS = 220

export function DrawerAssets({
  isOpen,
  onClose,
  form,
  setForm,
  categories,
  materialTypes,
  brands,
  suppliers,
  locations,
  loading,
  onSubmit,
  nextInventoryForMaterialTypeId,
}: DrawerAssetsProps) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      const mountId = window.setTimeout(() => setMounted(true), 0)
      const visibleId = window.setTimeout(() => setVisible(true), 10)
      return () => {
        window.clearTimeout(mountId)
        window.clearTimeout(visibleId)
      }
    }
    const hideId = window.setTimeout(() => setVisible(false), 0)
    const unmountId = window.setTimeout(() => setMounted(false), ANIMATION_MS)
    return () => {
      window.clearTimeout(hideId)
      window.clearTimeout(unmountId)
    }
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
        aria-label="Ajouter un matériel"
      >
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <h3 className="min-w-0 truncate text-base font-semibold text-gray-900">Ajouter un matériel</h3>
            <Button type="button" variant="default" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" onClick={onClose} disabled={loading}>
              Fermer
            </Button>
          </div>

          <form className="flex min-h-0 min-w-0 flex-1 flex-col" onSubmit={onSubmit}>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-5">
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:[&>*]:min-w-0">
              <Input
                label="Numéro d'inventaire (généré)"
                value={form.inventoryNumber}
                readOnly
                className="bg-gray-50 font-mono"
              />
              <Select
                label="Catégorie"
                value={form.categoryId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    categoryId: e.target.value ? Number(e.target.value) : '',
                  })
                }
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Type (PC, Imprimante, etc.)"
                value={form.materialTypeId}
                onChange={(e) => {
                  const nextId = e.target.value ? Number(e.target.value) : ''
                  setForm({
                    ...form,
                    materialTypeId: nextId,
                    inventoryNumber:
                      typeof nextId === 'number' ? nextInventoryForMaterialTypeId(nextId) : form.inventoryNumber,
                  })
                }}
              >
                <option value="">Sélectionner un type</option>
                {materialTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Marque"
                value={form.brandId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    brandId: e.target.value ? Number(e.target.value) : '',
                  })
                }
              >
                <option value="">Sélectionner une marque</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
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
                value={form.supplierId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    supplierId: e.target.value ? Number(e.target.value) : '',
                  })
                }
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Emplacement (optionnel)"
                value={form.locationId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    locationId: e.target.value ? Number(e.target.value) : '',
                  })
                }
              >
                <option value="">Aucun emplacement</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 py-4">
              <Button type="button" variant="default" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" disabled={loading}>
                Ajouter
              </Button>
            </div>
          </form>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
