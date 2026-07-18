import { useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { Button, Input, Select, Table, Textarea } from '../components/Ui'
import { errorMessageFromUnknown } from '../lib/errors'
import { formatDate } from '../lib/format'
import { useAssets } from '../api/hooks/useAssets'
import { useMaintenances } from '../api/hooks/useMaintenances'
import type { Asset } from '../types'
import type { Maintenance, MaintenanceStatus } from '../types'

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

const ALL_STATUSES: MaintenanceStatus[] = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE']

function assetLabel(asset: Asset): string {
  const brand = asset.brand?.name ?? ''
  const type = asset.materialType?.name ?? ''
  return `${asset.inventoryNumber}${brand || type ? ` — ${[brand, type].filter(Boolean).join(' ')}` : ''}`
}

export function MaintenancesPage() {
  const [items, setItems] = useState<Maintenance[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const [assetId, setAssetId] = useState('')
  const [title, setTitle] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [description, setDescription] = useState('')
  const [technician, setTechnician] = useState('')
  const [cost, setCost] = useState('')

  const { fetchMaintenances, createMaintenance, updateMaintenanceStatus, loading, error: apiError } =
    useMaintenances()
  const { fetchAssets, loading: assetsLoading } = useAssets()

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q) ||
        (m.technician ?? '').toLowerCase().includes(q) ||
        (m.asset?.inventoryNumber ?? '').toLowerCase().includes(q),
    )
  }, [items, search])

  const loadData = () => {
    setError(null)
    Promise.all([fetchMaintenances(), fetchAssets()])
      .then(([maintenances, assetList]) => {
        setItems(maintenances)
        setAssets(assetList)
      })
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des maintenances.')
      })
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetForm = () => {
    setAssetId('')
    setTitle('')
    setScheduledDate('')
    setDescription('')
    setTechnician('')
    setCost('')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!assetId) {
      toast.warning('Veuillez sélectionner un matériel.')
      return
    }
    if (!title.trim()) {
      toast.warning('Le titre est obligatoire.')
      return
    }
    if (!scheduledDate) {
      toast.warning('La date planifiée est obligatoire.')
      return
    }

    try {
      const created = await createMaintenance({
        assetId: Number(assetId),
        title: title.trim(),
        scheduledDate,
        description: description.trim() || undefined,
        technician: technician.trim() || undefined,
        cost: cost.trim() ? Number(cost) : undefined,
      })
      setItems((prev) => [created, ...prev])
      toast.success('Maintenance planifiée avec succès.')
      resetForm()
      setFormOpen(false)
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e, "Erreur lors de l'ajout de la maintenance.")
      setError(msg)
      toast.error(msg)
    }
  }

  const handleStatusChange = async (id: number, status: MaintenanceStatus) => {
    setError(null)
    try {
      const updated = await updateMaintenanceStatus(id, { status })
      setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      toast.success(`Statut mis à jour : ${STATUS_LABELS[status]}.`)
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e, 'Erreur lors du changement de statut.')
      setError(msg)
      toast.error(msg)
    }
  }

  const busy = loading || assetsLoading

  return (
    <div className="space-y-6">
      {error || apiError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? apiError}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une maintenance..."
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
          {formOpen ? 'Masquer le formulaire' : 'Planifier une maintenance'}
        </Button>
      </div>

      {formOpen && (
        <div className="border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Nouvelle maintenance</h2>
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
            <Input
              label="Titre"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Remplacement disque dur"
            />
            <Input
              label="Date planifiée"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
            <Input
              label="Technicien (optionnel)"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              placeholder="Nom du technicien"
            />
            <Input
              label="Coût estimé (optionnel)"
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Description (optionnelle)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails de l'intervention prévue"
                rows={3}
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
                Planifier
              </Button>
            </div>
          </form>
        </div>
      )}

      <Table columns={['Matériel', 'Titre', 'Date planifiée', 'Technicien', 'Coût', 'Statut', 'Actions']}>
        {filteredItems.map((m) => (
          <tr key={m.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-900">
              {m.asset?.inventoryNumber ?? `#${m.assetId}`}
            </td>
            <td className="px-4 py-3 font-medium text-gray-900">{m.title}</td>
            <td className="px-4 py-3 text-gray-600">{formatDate(m.scheduledDate)}</td>
            <td className="px-4 py-3 text-gray-600">{m.technician || <span className="text-gray-400">—</span>}</td>
            <td className="px-4 py-3 text-gray-600">
              {m.cost != null ? Number(m.cost).toFixed(2) : <span className="text-gray-400">—</span>}
            </td>
            <td className="px-4 py-3">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {STATUS_LABELS[m.status]}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {ALL_STATUSES.filter((s) => s !== m.status).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(m.id, s)}
                    className="rounded px-2 py-1 text-xs text-gray-700 cursor-pointer hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
                    disabled={busy}
                    title={`Passer à ${STATUS_LABELS[s]}`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </td>
          </tr>
        ))}
        {!filteredItems.length && (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
              {items.length === 0 ? (
                busy ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : (
                  'Aucune maintenance planifiée.'
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
