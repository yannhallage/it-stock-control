import { useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { Button, Input, Table } from '../components/Ui'
import { errorMessageFromUnknown } from '../lib/errors'
import { useLocations, type Location } from '../api/hooks/useLocations'

export function LocationsPage() {
  const [items, setItems] = useState<Location[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [room, setRoom] = useState('')

  const { fetchLocations, createLocation, updateLocation, deleteLocation, loading, error: apiError } =
    useLocations()

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.building ?? '').toLowerCase().includes(q) ||
        (l.floor ?? '').toLowerCase().includes(q) ||
        (l.room ?? '').toLowerCase().includes(q),
    )
  }, [items, search])

  const resetForm = () => {
    setName('')
    setBuilding('')
    setFloor('')
    setRoom('')
  }

  const openAdd = () => {
    setEditingId(null)
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (l: Location) => {
    setEditingId(l.id)
    setName(l.name)
    setBuilding(l.building ?? '')
    setFloor(l.floor ?? '')
    setRoom(l.room ?? '')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
  }

  useEffect(() => {
    setError(null)
    fetchLocations()
      .then(setItems)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des emplacements.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.warning("Le nom de l'emplacement est obligatoire.")
      return
    }

    const payload = {
      name: trimmedName,
      building: building.trim() || undefined,
      floor: floor.trim() || undefined,
      room: room.trim() || undefined,
    }

    try {
      if (editingId !== null) {
        const updated = await updateLocation(editingId, payload)
        setItems((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
        toast.success('Emplacement modifié avec succès.')
      } else {
        const created = await createLocation(payload)
        setItems((prev) => [...prev, created])
        toast.success('Emplacement ajouté avec succès.')
      }
      closeModal()
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e, "Erreur lors de l'enregistrement de l'emplacement.")
      setError(msg)
      toast.error(msg)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Supprimer cet emplacement ?')) {
      setError(null)
      try {
        await deleteLocation(id)
        setItems((prev) => prev.filter((l) => l.id !== id))
        toast.success('Emplacement supprimé.')
      } catch (e: unknown) {
        const msg = errorMessageFromUnknown(e, "Erreur lors de la suppression de l'emplacement.")
        setError(msg)
        toast.error(msg)
      }
    }
  }

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
            placeholder="Rechercher un emplacement..."
            className="w-full border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={openAdd}
          className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
          disabled={loading}
        >
          Ajouter un emplacement
        </Button>
      </div>

      <Table columns={['Nom', 'Bâtiment', 'Étage', 'Salle', 'Actions']}>
        {filteredItems.map((l) => (
          <tr key={l.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-medium text-gray-900">{l.name}</td>
            <td className="px-4 py-3 text-gray-600">{l.building || <span className="text-gray-400">—</span>}</td>
            <td className="px-4 py-3 text-gray-600">{l.floor || <span className="text-gray-400">—</span>}</td>
            <td className="px-4 py-3 text-gray-600">{l.room || <span className="text-gray-400">—</span>}</td>
            <td className="px-4 py-3 float-right">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(l)}
                  className="rounded px-2 py-1 text-xs text-gray-700 cursor-pointer hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
                  disabled={loading}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(l.id)}
                  className="rounded px-2 py-1 text-xs text-red-600 cursor-pointer hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
                  disabled={loading}
                >
                  Supprimer
                </button>
              </div>
            </td>
          </tr>
        ))}
        {!filteredItems.length && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
              {items.length === 0 ? (
                loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : (
                  'Aucun emplacement. Cliquez sur « Ajouter un emplacement » pour commencer.'
                )
              ) : (
                'Aucun résultat pour cette recherche.'
              )}
            </td>
          </tr>
        )}
      </Table>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="w-full max-w-md border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId !== null ? 'Modifier un emplacement' : 'Ajouter un emplacement'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <Input
                label="Nom de l'emplacement"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Bureau 201, Salle serveurs..."
              />
              <Input
                label="Bâtiment (optionnel)"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="Ex. Bâtiment A"
              />
              <Input
                label="Étage (optionnel)"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="Ex. 2e étage"
              />
              <Input
                label="Salle (optionnelle)"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Ex. Salle 201"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" onClick={closeModal} disabled={loading} className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60">
                  Annuler
                </Button>
                <Button type="submit" variant="primary" disabled={loading} className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60">
                  {editingId !== null ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
