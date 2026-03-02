import { useState, useMemo } from 'react'
import { toast } from 'react-toastify'
import { Button, Input } from '../components/Ui'

type Supplier = {
  id: number
  name: string
  contact: string
  address: string
}

let nextId = 1

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [address, setAddress] = useState('')

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers
    const q = search.trim().toLowerCase()
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q),
    )
  }, [suppliers, search])

  const openAdd = () => {
    setEditingId(null)
    setName('')
    setContact('')
    setAddress('')
    setModalOpen(true)
  }

  const openEdit = (s: Supplier) => {
    setEditingId(s.id)
    setName(s.name)
    setContact(s.contact)
    setAddress(s.address)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.warning('Le nom du fournisseur est obligatoire.')
      return
    }
    if (editingId !== null) {
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? { ...s, name: trimmedName, contact: contact.trim(), address: address.trim() }
            : s,
        ),
      )
      toast.success('Fournisseur modifié avec succès.')
    } else {
      setSuppliers((prev) => [
        ...prev,
        { id: nextId++, name: trimmedName, contact: contact.trim(), address: address.trim() },
      ])
      toast.success('Fournisseur ajouté avec succès.')
    }
    closeModal()
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Supprimer ce fournisseur ?')) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id))
      toast.success('Fournisseur supprimé.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Barre : recherche + bouton Ajouter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un fournisseur..."
            className="w-full border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={openAdd}
          className="inline-flex items-center cursor-pointer gap-2 px-4 py-2.5"
        >
          <PlusIcon className="h-5 w-5" />
          Ajouter un fournisseur
        </Button>
      </div>

      {/* Grille de cartes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.map((s) => (
          <article
            key={s.id}
            className="relative flex border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-emerald-50 text-[var(--color-primary)]">
                  <BuildingIcon className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-gray-900">{s.name}</h3>
                  {s.address ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                      <LocationIcon className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate">{s.address}</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="p-1.5 text-gray-500 cursor-pointer  hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Modifier"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 text-red-500 cursor-pointer hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {s.contact ? (
                <p className="text-sm text-gray-500">{s.contact}</p>
              ) : null}
              <p className="mt-2 text-sm font-medium text-[var(--color-primary)]">
                {s.contact ? '1 contact' : 'Aucun contact'}
              </p>
            </div>
          </article>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="border border-gray-200 bg-white py-16 text-center">
          <p className="text-gray-500">
            {suppliers.length === 0
              ? 'Aucun fournisseur. Cliquez sur « Ajouter un fournisseur » pour commencer.'
              : 'Aucun résultat pour cette recherche.'}
          </p>
        </div>
      )}

      {/* Modal formulaire */}
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
              {editingId !== null ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <Input
                label="Nom du fournisseur"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Tech Solutions"
              />
              <Input
                label="Contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Téléphone ou email"
              />
              <Input
                label="Adresse"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Adresse du fournisseur"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" onClick={closeModal}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary">
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
