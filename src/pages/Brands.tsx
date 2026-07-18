import { useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { Button, Input, Table } from '../components/Ui'
import { errorMessageFromUnknown } from '../lib/errors'
import { useBrands, type Brand } from '../api/hooks/useBrands'

export function BrandsPage() {
  const [items, setItems] = useState<Brand[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')

  const { fetchBrands, createBrand, updateBrand, deleteBrand, loading, error: apiError } = useBrands()

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter((b) => b.name.toLowerCase().includes(q))
  }, [items, search])

  const openAdd = () => {
    setEditingId(null)
    setName('')
    setModalOpen(true)
  }

  const openEdit = (b: Brand) => {
    setEditingId(b.id)
    setName(b.name)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
  }

  useEffect(() => {
    setError(null)
    fetchBrands()
      .then(setItems)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des marques.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.warning('Le nom de la marque est obligatoire.')
      return
    }

    try {
      if (editingId !== null) {
        const updated = await updateBrand(editingId, { name: trimmedName })
        setItems((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
        toast.success('Marque modifiée avec succès.')
      } else {
        const created = await createBrand({ name: trimmedName })
        setItems((prev) => [...prev, created])
        toast.success('Marque ajoutée avec succès.')
      }
      closeModal()
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e, "Erreur lors de l'enregistrement de la marque.")
      setError(msg)
      toast.error(msg)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Supprimer cette marque ?')) {
      setError(null)
      try {
        await deleteBrand(id)
        setItems((prev) => prev.filter((b) => b.id !== id))
        toast.success('Marque supprimée.')
      } catch (e: unknown) {
        const msg = errorMessageFromUnknown(e, 'Erreur lors de la suppression de la marque.')
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
            placeholder="Rechercher une marque..."
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
          Ajouter une marque
        </Button>
      </div>

      <Table columns={['Nom', 'Actions']}>
        {filteredItems.map((b) => (
          <tr key={b.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
            <td className="px-4 py-3 float-right">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(b)}
                  className="rounded px-2 py-1 text-xs text-gray-700 cursor-pointer hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
                  disabled={loading}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
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
                  'Aucune marque. Cliquez sur « Ajouter une marque » pour commencer.'
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
              {editingId !== null ? 'Modifier une marque' : 'Ajouter une marque'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <Input
                label="Nom de la marque"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Dell, HP, Lenovo..."
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
