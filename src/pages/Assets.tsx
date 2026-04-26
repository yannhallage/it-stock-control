import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useSuppliers } from '../api/hooks/useSuppliers'
import { useMaterialTypes } from '../api/hooks/useMaterialTypes'
import { errorMessageFromUnknown } from '../lib/errors'
import { formatDate } from '../lib/format'
import type { Asset, AssetStatus } from '../types'
import type { Supplier } from '../api/services/suppliers.service'
import type { MaterialType } from '../api/services/material-types.service'
import { StatusBadge } from '../components/Badge'
import { ConfirmModal } from '../components/Modal'
import { Button, Card, Input, PageTitle, Select, Table } from '../components/Ui'

type AssetCreateInput = {
  inventoryNumber: string
  serialNumber: string
  type: string
  brand: string
  model: string
  entryDate: string
  warrantyMonths: string
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

/** Préfixe court (max 4 car.) dérivé du libellé du type de matériel. */
function materialTypePrefix(typeName: string): string {
  const t = typeName.trim()
  if (!t) return 'MAT'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return parts
      .slice(0, 4)
      .map((p) => {
        const c = p.charAt(0)
        const u = c
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .toUpperCase()
        return /^[A-Z0-9]$/u.test(u) ? u : 'X'
      })
      .join('')
  }
  const ascii = parts[0]
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  return (ascii.slice(0, 4) || 'MAT')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Prochain numéro du type `PC0002`, `PC00303` (préfixe + suite numérique). */
function nextSequentialInventoryNumber(materialType: string, assets: Asset[]): string {
  const prefix = materialTypePrefix(materialType)
  const re = new RegExp(`^${escapeRegex(prefix)}(\\d+)$`, 'i')
  let max = 0
  let maxWidth = 4
  for (const a of assets) {
    const m = a.inventoryNumber.match(re)
    if (m) {
      const digits = m[1]
      maxWidth = Math.max(maxWidth, digits.length)
      const n = parseInt(digits, 10)
      if (!Number.isNaN(n) && n > max) max = n
    }
  }
  const next = max + 1
  const padded = String(next).padStart(Math.max(maxWidth, String(next).length), '0')
  return `${prefix}${padded}`
}

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 9V4h12v5M6 18h12v2H6v-2zm12-3h1a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2h1m12 0H6v-4h12v4z"
      />
    </svg>
  )
}

export function AssetsPage() {
  const [items, setItems] = useState<Asset[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState<AssetStatus | ''>('')

  const [allAssets, setAllAssets] = useState<Asset[]>([])

  const [form, setForm] = useState<AssetCreateInput>(() => ({
    inventoryNumber: nextSequentialInventoryNumber('PC', []),
    serialNumber: '',
    type: 'PC',
    brand: '',
    model: '',
    entryDate: new Date().toISOString().slice(0, 10),
    warrantyMonths: '',
    supplier: '',
  }))

  const [assetToDelete, setAssetToDelete] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { fetchAssets, createAsset, deleteAsset, loading, error: apiError } = useAssets()
  const { fetchSuppliers } = useSuppliers()
  const { fetchMaterialTypes } = useMaterialTypes()

  const loadAllForSeq = useCallback(async () => {
    const assets = await fetchAssets({})
    setAllAssets(assets)
    return assets
  }, [fetchAssets])

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
    loadAllForSeq().catch((e) => {
      const msg = String(e?.message ?? e)
      toast.error(msg || 'Erreur lors du chargement des matériels (séquence inventaire).')
    })
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

  useEffect(() => {
    setForm((f) => ({
      ...f,
      inventoryNumber: nextSequentialInventoryNumber(f.type, allAssets),
    }))
  }, [allAssets])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedForm: AssetCreateInput = {
      ...form,
      serialNumber: form.serialNumber.trim(),
      type: form.type.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      warrantyMonths: form.warrantyMonths.trim(),
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
    if (!trimmedForm.serialNumber) {
      toast.warning('Veuillez saisir le numéro de série.')
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
    const warrantyMonths = Number(trimmedForm.warrantyMonths)
    if (!Number.isFinite(warrantyMonths) || warrantyMonths <= 0) {
      toast.warning('Veuillez saisir un délai de garantie valide (en mois).')
      return
    }
    if (!trimmedForm.supplier) {
      toast.warning('Veuillez sélectionner un fournisseur.')
      return
    }

    try {
      await createAsset({
        ...trimmedForm,
        warrantyMonths,
      })
      toast.success('Matériel ajouté avec succès.')
      const fresh = await loadAllForSeq()
      setForm((f) => ({
        ...f,
        inventoryNumber: nextSequentialInventoryNumber(f.type, fresh),
        serialNumber: '',
        brand: '',
        model: '',
        warrantyMonths: '',
        supplier: '',
      }))
      load()
    } catch (err: unknown) {
      const msg = errorMessageFromUnknown(err, "Erreur lors de l'ajout du matériel.")
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
      await loadAllForSeq()
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

  const handlePrint = () => {
    window.print()
  }

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
        <Button
          onClick={() => {
            load()
            loadAllForSeq().catch((e) => {
              const msg = String(e?.message ?? e)
              toast.error(msg || 'Erreur lors du chargement.')
            })
          }}
          disabled={loading}
          className="cursor-pointer flex items-center gap-2"
        >
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
            onChange={(e) => {
              const nextType = e.target.value
              setForm({
                ...form,
                type: nextType,
                inventoryNumber: nextSequentialInventoryNumber(nextType, allAssets),
              })
            }}
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
            placeholder="Ex: PC0002, PC00303, HP…"
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
            <Button onClick={handlePrint} className="cursor-pointer flex items-center gap-2" title="Imprimer">
              <PrintIcon className="h-5 w-5" />
            </Button>
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

        <Table
          columns={[
            'Inventaire',
            'N° série',
            'Type',
            'Marque',
            'Modèle',
            'Entrée',
            'Garantie',
            'Fournisseur',
            'État',
            'Actions',
          ]}
        >
          {items.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {a.inventoryNumber}
              </td>
              <td className="px-4 py-3 text-gray-600">{a.serialNumber || '—'}</td>
              <td className="px-4 py-3 text-gray-600">{a.type}</td>
              <td className="px-4 py-3 text-gray-600">{a.brand}</td>
              <td className="px-4 py-3 text-gray-600">{a.model}</td>
              <td className="px-4 py-3 text-gray-600">{formatDate(a.entryDate)}</td>
              <td className="px-4 py-3 text-gray-600">
                {typeof a.warrantyMonths === 'number' ? `${a.warrantyMonths} mois` : '—'}
              </td>
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
              <td className="px-4 py-8 text-center text-gray-500" colSpan={10}>
                {loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : (
                  'Aucun matériel.'
                )}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}
