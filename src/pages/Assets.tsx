import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useSuppliers } from '../api/hooks/useSuppliers'
import { useMaterialTypes } from '../api/hooks/useMaterialTypes'
import { formatDate } from '../lib/format'
import type { Asset, AssetStatus } from '../types'
import type { Supplier } from '../api/services/suppliers.service'
import type { MaterialType } from '../api/services/material-types.service'
import { StatusBadge } from '../components/Badge'
import { ConfirmModal } from '../components/Modal'
import { Button, Card, Input, PageTitle, Select, Table } from '../components/Ui'

type AssetCreateInput = {
  inventoryNumber: string
  type: string
  brand: string
  model: string
  entryDate: string
  supplier: string
}

const statusOptions: Array<{ value: AssetStatus | ''; label: string }> = [
  { value: '', label: 'Tous' },
  { value: 'EN_STOCK', label: 'En Stock' },
  { value: 'AFFECTE', label: 'Affecté' },
  { value: 'EN_PANNE', label: 'En Panne' },
  { value: 'EN_REPARATION', label: 'En Réparation' },
  { value: 'EN_SERVICE', label: 'En Service' },
  { value: 'HORS_SERVICE', label: 'Hors Service' },
]

function generateInventoryNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = 'INV-'
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function AssetsPage() {
  const [items, setItems] = useState<Asset[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState<AssetStatus | ''>('')

  const [form, setForm] = useState<AssetCreateInput>(() => ({
    inventoryNumber: generateInventoryNumber(),
    type: 'PC',
    brand: '',
    model: '',
    entryDate: new Date().toISOString().slice(0, 10),
    supplier: '',
  }))

  const [assetToDelete, setAssetToDelete] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { fetchAssets, createAsset, deleteAsset, loading, error: apiError } = useAssets()
  const { fetchSuppliers } = useSuppliers()
  const { fetchMaterialTypes } = useMaterialTypes()

  const types = useMemo(() => {
    const s = new Set(items.map((a) => a.type).filter(Boolean))
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [items])

  function load() {
    setError(null)
    fetchAssets({ q, type, status })
      .then(setItems)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement.')
      })
  }

  useEffect(() => {
    load()
    fetchSuppliers()
      .then(setSuppliers)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des fournisseurs.')
      })
    fetchMaterialTypes()
      .then(setMaterialTypes)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des types de matériel.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedForm: AssetCreateInput = {
      ...form,
      type: form.type.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      supplier: form.supplier.trim(),
    }

    if (!trimmedForm.inventoryNumber) {
      toast.warning("Le numéro d'inventaire est manquant.")
      return
    }
    if (!trimmedForm.type) {
      toast.warning('Veuillez sélectionner un type de matériel.')
      return
    }
    if (!trimmedForm.brand) {
      toast.warning('Veuillez saisir la marque du matériel.')
      return
    }
    if (!trimmedForm.model) {
      toast.warning('Veuillez saisir le modèle du matériel.')
      return
    }
    if (!trimmedForm.entryDate) {
      toast.warning("Veuillez saisir la date d'entrée.")
      return
    }
    if (!trimmedForm.supplier) {
      toast.warning('Veuillez sélectionner un fournisseur.')
      return
    }

    try {
      await createAsset(trimmedForm)
      toast.success('Matériel ajouté avec succès.')
      setForm((f) => ({
        ...f,
        inventoryNumber: generateInventoryNumber(),
        brand: '',
        model: '',
        supplier: '',
      }))
      load()
    } catch (err: any) {
      const msg = String(err?.message ?? err)
      setError(msg)
      toast.error(msg || "Erreur lors de l'ajout du matériel.")
    }
  }

  async function confirmDelete() {
    if (assetToDelete == null) return
    setError(null)
    setDeleteLoading(true)
    try {
      await deleteAsset(assetToDelete)
      toast.success('Matériel supprimé.')
      setAssetToDelete(null)
      load()
    } catch (err: unknown) {
      const msg = String((err as Error)?.message ?? err)
      setError(msg)
      toast.error(msg || 'Erreur lors de la suppression.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const assetLabel =
    assetToDelete != null
      ? items.find((a) => a.id === assetToDelete)?.inventoryNumber ?? 'ce matériel'
      : ''

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={assetToDelete != null}
        onClose={() => setAssetToDelete(null)}
        onConfirm={confirmDelete}
        title="Supprimer le matériel"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        loading={deleteLoading}
      >
        Êtes-vous sûr de vouloir supprimer <strong>{assetLabel}</strong> ? Cette action est irréversible.
      </ConfirmModal>
      <div className="flex items-center justify-between">
        <PageTitle>Gestion de Stock</PageTitle>
        <Button onClick={load} disabled={loading} className="cursor-pointer flex items-center gap-2">
          Actualiser
        </Button>
      </div>

      {error || apiError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? apiError}
        </div>
      ) : null}

      <Card title="Ajouter un matériel">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-3" onSubmit={onCreate}>
          <Input
            label="Numéro d'inventaire (généré)"
            value={form.inventoryNumber}
            readOnly
            className="bg-gray-50 font-mono"
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
          <div className="md:col-span-3">
            <Button type="submit" className="cursor-pointer flex items-center gap-2" variant="primary" disabled={loading}>
              Ajouter
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Liste du matériel">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input
            label="Recherche (inventaire, marque, modèle, fournisseur)"
            placeholder="Ex: INV-001, HP, Lenovo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tous</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            label="État"
            value={status}
            onChange={(e) => setStatus(e.target.value as AssetStatus | '')}
          >
            {statusOptions.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <div className="flex items-end gap-2">
            <Button onClick={load} className="cursor-pointer flex items-center gap-2" disabled={loading}>
              Filtrer
            </Button>
            <Button
              onClick={() => {
                setQ('')
                setType('')
                setStatus('')
                setTimeout(load, 0)
              }}
              disabled={loading}
              className="flex items-center gap-2"
            >
              Réinitialiser
            </Button>
          </div>
        </div>

        <Table columns={['Inventaire', 'Type', 'Marque', 'Modèle', 'Entrée', 'Fournisseur', 'État', 'Actions']}>
          {items.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {a.inventoryNumber}
              </td>
              <td className="px-4 py-3 text-gray-600">{a.type}</td>
              <td className="px-4 py-3 text-gray-600">{a.brand}</td>
              <td className="px-4 py-3 text-gray-600">{a.model}</td>
              <td className="px-4 py-3 text-gray-600">{formatDate(a.entryDate)}</td>
              <td className="px-4 py-3 text-gray-600">{a.supplier}</td>
              <td className="px-4 py-3 text-gray-600">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/assets/${a.id}`}
                    className={`rounded p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer ${loading ? 'pointer-events-none opacity-50' : ''}`}
                    title="Historique / Aperçu"
                    aria-label="Voir l'historique"
                  >
                    Historique
                  </Link>
                  <div
                    className={`rounded p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600 cursor-pointer ${loading ? 'pointer-events-none opacity-50' : ''}`}
                    title="Supprimer"
                    aria-label="Supprimer"
                    onClick={() => !loading && setAssetToDelete(a.id)}
                  >
                    Supprimer
                  </div>
                </div>
              </td>
            </tr>
          ))}
          {!items.length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                {loading ? 'Chargement…' : 'Aucun matériel.'}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}
