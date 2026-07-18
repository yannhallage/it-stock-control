import { useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { Button, Input, Select, Table, Textarea } from '../components/Ui'
import { errorMessageFromUnknown } from '../lib/errors'
import { formatDate } from '../lib/format'
import { useAssets } from '../api/hooks/useAssets'
import { useLocations } from '../api/hooks/useLocations'
import {
  createMovementService,
  listMovementsService,
} from '../api/services/movements.service'
import type { Asset, AssetMovement, MovementType } from '../types'

const MOVEMENT_LABELS: Record<MovementType, string> = {
  ENTREE: 'Entrée',
  SORTIE: 'Sortie',
  TRANSFERT: 'Transfert',
}

function assetLabel(asset: Asset): string {
  const brand = asset.brand?.name ?? ''
  const type = asset.materialType?.name ?? ''
  return `${asset.inventoryNumber}${brand || type ? ` — ${[brand, type].filter(Boolean).join(' ')}` : ''}`
}

function locationLabel(id: number | null | undefined, name?: string | null): string {
  if (name) return name
  if (id != null) return `#${id}`
  return '—'
}

export function MovementsPage() {
  const [items, setItems] = useState<AssetMovement[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  const [assetId, setAssetId] = useState('')
  const [movementType, setMovementType] = useState<MovementType>('ENTREE')
  const [movedAt, setMovedAt] = useState('')
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [note, setNote] = useState('')

  const { fetchAssets, loading: assetsLoading } = useAssets()
  const { fetchLocations, loading: locationsLoading } = useLocations()

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter(
      (m) =>
        (m.asset?.inventoryNumber ?? '').toLowerCase().includes(q) ||
        MOVEMENT_LABELS[m.movementType].toLowerCase().includes(q) ||
        (m.note ?? '').toLowerCase().includes(q) ||
        (m.fromLocation?.name ?? '').toLowerCase().includes(q) ||
        (m.toLocation?.name ?? '').toLowerCase().includes(q),
    )
  }, [items, search])

  const loadData = () => {
    setError(null)
    Promise.all([listMovementsService(), fetchAssets(), fetchLocations()])
      .then(([movements, assetList, locationList]) => {
        setItems(movements)
        setAssets(assetList)
        setLocations(locationList)
      })
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des mouvements.')
      })
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetForm = () => {
    setAssetId('')
    setMovementType('ENTREE')
    setMovedAt('')
    setFromLocationId('')
    setToLocationId('')
    setNote('')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!assetId) {
      toast.warning('Veuillez sélectionner un matériel.')
      return
    }
    if (!movedAt) {
      toast.warning('La date du mouvement est obligatoire.')
      return
    }

    setSubmitting(true)
    try {
      const created = await createMovementService({
        assetId: Number(assetId),
        movementType,
        movedAt,
        fromLocationId: fromLocationId ? Number(fromLocationId) : undefined,
        toLocationId: toLocationId ? Number(toLocationId) : undefined,
        note: note.trim() || undefined,
      })
      setItems((prev) => [created, ...prev])
      toast.success('Mouvement enregistré avec succès.')
      resetForm()
      setFormOpen(false)
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e, "Erreur lors de l'enregistrement du mouvement.")
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const busy = submitting || assetsLoading || locationsLoading

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un mouvement..."
            className="w-full border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => setFormOpen((v) => !v)}
          className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
          disabled={busy}
        >
          {formOpen ? 'Masquer le formulaire' : 'Enregistrer un mouvement'}
        </Button>
      </div>

      {formOpen && (
        <div className="border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Nouveau mouvement</h2>
          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="Matériel"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              disabled={busy}
            >
              <option value="">— Sélectionner —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {assetLabel(a)}
                </option>
              ))}
            </Select>
            <Select
              label="Type de mouvement"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as MovementType)}
              disabled={busy}
            >
              <option value="ENTREE">Entrée</option>
              <option value="SORTIE">Sortie</option>
              <option value="TRANSFERT">Transfert</option>
            </Select>
            <Input
              label="Date du mouvement"
              type="datetime-local"
              value={movedAt}
              onChange={(e) => setMovedAt(e.target.value)}
            />
            <Select
              label="Emplacement d'origine (optionnel)"
              value={fromLocationId}
              onChange={(e) => setFromLocationId(e.target.value)}
              disabled={busy}
            >
              <option value="">— Aucun —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Select
              label="Emplacement de destination (optionnel)"
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              disabled={busy}
            >
              <option value="">— Aucun —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <div className="sm:col-span-2">
              <Textarea
                label="Note (optionnelle)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Motif ou commentaire"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button
                type="button"
                onClick={() => {
                  resetForm()
                  setFormOpen(false)
                }}
                disabled={busy}
                className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={busy}
                className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
              >
                Enregistrer
              </Button>
            </div>
          </form>
        </div>
      )}

      <Table columns={['Matériel', 'Type', 'Date', 'Origine', 'Destination', 'Note']}>
        {filteredItems.map((m) => (
          <tr key={m.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-900">
              {m.asset?.inventoryNumber ?? `#${m.assetId}`}
            </td>
            <td className="px-4 py-3">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {MOVEMENT_LABELS[m.movementType]}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-600">{formatDate(m.movedAt)}</td>
            <td className="px-4 py-3 text-gray-600">
              {locationLabel(m.fromLocationId, m.fromLocation?.name)}
            </td>
            <td className="px-4 py-3 text-gray-600">
              {locationLabel(m.toLocationId, m.toLocation?.name)}
            </td>
            <td className="px-4 py-3 text-gray-600">{m.note || <span className="text-gray-400">—</span>}</td>
          </tr>
        ))}
        {!filteredItems.length && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
              {items.length === 0 ? (
                assetsLoading || locationsLoading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : (
                  'Aucun mouvement enregistré.'
                )
              ) : (
                'Aucun résultat pour cette recherche.'
              )}
            </td>
          </tr>
        )}
      </Table>
    </div>
  )
}
