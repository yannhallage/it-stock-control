import { useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { Button, Input, Table } from '../components/Ui'
import { errorMessageFromUnknown } from '../lib/errors'
import { useCategories, type Category } from '../api/hooks/useCategories'

export function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')

  const { fetchCategories, createCategory, updateCategory, deleteCategory, loading, error: apiError } =
    useCategories()

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter((c) => c.name.toLowerCase().includes(q))
  }, [items, search])

  const openAdd = () => {
    setEditingId(null)
    setName('')
    setModalOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditingId(c.id)
    setName(c.name)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
  }

  useEffect(() => {
    setError(null)
    fetchCategories()
      .then(setItems)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des catégories.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.warning('Le nom de la catégorie est obligatoire.')
      return
    }

    try {
      if (editingId !== null) {
        const updated = await updateCategory(editingId, { name: trimmedName })
        setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        toast.success('Catégorie modifiée avec succès.')
      } else {
        const created = await createCategory({ name: trimmedName })
        setItems((prev) => [...prev, created])
        toast.success('Catégorie ajoutée avec succès.')
      }
      closeModal()
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e, "Erreur lors de l'enregistrement de la catégorie.")
      setError(msg)
      toast.error(msg)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Supprimer cette catégorie ?')) {
      setError(null)
      try {
        await deleteCategory(id)
        setItems((prev) => prev.filter((c) => c.id !== id))
        toast.success('Catégorie supprimée.')
      } catch (e: unknown) {
        const msg = errorMessageFromUnknown(e, 'Erreur lors de la suppression de la catégorie.')
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
            placeholder="Rechercher une catégorie..."
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
          Ajouter une catégorie
        </Button>
      </div>

      <Table columns={['Nom', 'Actions']}>
        {filteredItems.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
            <td className="px-4 py-3 float-right">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="rounded px-2 py-1 text-xs text-gray-700 cursor-pointer hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
                  disabled={loading}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
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
            <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
              {items.length === 0 ? (
                loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : (
                  'Aucune catégorie. Cliquez sur « Ajouter une catégorie » pour commencer.'
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
              {editingId !== null ? 'Modifier une catégorie' : 'Ajouter une catégorie'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <Input
                label="Nom de la catégorie"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Ordinateur portable, Écran..."
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
