import { useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { Button, Input, Table } from '../components/Ui'
import { errorMessageFromUnknown } from '../lib/errors'
import { useMaterialTypes } from '../api/hooks/useMaterialTypes'
import type { MaterialType } from '../api/services/material-types.service'

export function MaterialTypesPage() {
  const [items, setItems] = useState<MaterialType[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { fetchMaterialTypes, createMaterialType, updateMaterialType, deleteMaterialType, loading, error: apiError } =
    useMaterialTypes()

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    )
  }, [items, search])

  const openAdd = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setModalOpen(true)
  }

  const openEdit = (t: MaterialType) => {
    setEditingId(t.id)
    setName(t.name)
    setDescription(t.description)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
  }

  useEffect(() => {
    setError(null)
    fetchMaterialTypes()
      .then(setItems)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des types de matériel.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.warning('Le libellé du type est obligatoire.')
      return
    }

    try {
      if (editingId !== null) {
        const updated = await updateMaterialType(editingId, {
          name: trimmedName,
          description: description.trim(),
        })
        setItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        toast.success('Type de matériel modifié avec succès.')
      } else {
        const created = await createMaterialType({
          name: trimmedName,
          description: description.trim(),
        })
        setItems((prev) => [...prev, created])
        toast.success('Type de matériel ajouté avec succès.')
      }

      closeModal()
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e, "Erreur lors de l'enregistrement du type de matériel.")
      setError(msg)
      toast.error(msg)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Supprimer ce type de matériel ?')) {
      setError(null)
      try {
        await deleteMaterialType(id)
        setItems((prev) => prev.filter((t) => t.id !== id))
        toast.success('Type de matériel supprimé.')
      } catch (e: unknown) {
        const msg = errorMessageFromUnknown(e, 'Erreur lors de la suppression du type de matériel.')
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
            placeholder="Rechercher un type (PC, Imprimante, Switch...)"
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
          Ajouter un type
        </Button>
      </div>

      <Table columns={['Libellé', 'Description', 'Actions']}>
        {filteredItems.map((t) => (
          <tr key={t.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
            <td className="px-4 py-3 text-gray-600">
              {t.description || <span className="text-gray-400">—</span>}
            </td>
            <td className="px-4 py-3 float-right">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  className="rounded px-2 py-1 text-xs text-gray-700 cursor-pointer hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
                  disabled={loading}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
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
            <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
              {items.length === 0 ? (
                loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : (
                  'Aucun type de matériel. Cliquez sur « Ajouter un type » pour commencer.'
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
              {editingId !== null ? 'Modifier un type de matériel' : 'Ajouter un type de matériel'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <Input
                label="Libellé du type"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. PC, Imprimante, Switch..."
              />
              <Input
                label="Description (optionnelle)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails sur le type de matériel"
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

