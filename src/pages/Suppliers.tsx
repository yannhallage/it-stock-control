import { useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { Button, Input, Table } from '../components/Ui'
import { errorMessageFromUnknown } from '../lib/errors'
import { formatDate } from '../lib/format'
import { useSuppliers } from '../api/hooks/useSuppliers'
import { useImpression } from '../api/hooks/useImpression'
import type { Supplier } from '../api/services/suppliers.service'

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

function ViewCardsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function ViewTableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
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

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier, loading, error: apiError } = useSuppliers()
  const { downloadReport, loading: printLoading, error: printError } = useImpression()

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers
    const q = search.trim().toLowerCase()
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contact ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        (s.phone ?? '').toLowerCase().includes(q) ||
        (s.address ?? '').toLowerCase().includes(q),
    )
  }, [suppliers, search])

  const openAdd = () => {
    setEditingId(null)
    setName('')
    setContact('')
    setEmail('')
    setPhone('')
    setAddress('')
    setModalOpen(true)
  }

  const openEdit = (s: Supplier) => {
    setEditingId(s.id)
    setName(s.name)
    setContact(s.contact ?? '')
    setEmail(s.email ?? '')
    setPhone(s.phone ?? '')
    setAddress(s.address ?? '')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
  }

  useEffect(() => {
    setError(null)
    fetchSuppliers()
      .then(setSuppliers)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des fournisseurs.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.warning('Le nom du fournisseur est obligatoire.')
      return
    }
    try {
      if (editingId !== null) {
        const updated = await updateSupplier(editingId, {
          name: trimmedName,
          contact: contact.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
        })
        setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        toast.success('Fournisseur modifié avec succès.')
      } else {
        const created = await createSupplier({
          name: trimmedName,
          contact: contact.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
        })
        setSuppliers((prev) => [...prev, created])
        toast.success('Fournisseur ajouté avec succès.')
      }
      closeModal()
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e, "Erreur lors de l'enregistrement du fournisseur.")
      setError(msg)
      toast.error(msg)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Supprimer ce fournisseur ?')) {
      setError(null)
      try {
        await deleteSupplier(id)
        setSuppliers((prev) => prev.filter((s) => s.id !== id))
        toast.success('Fournisseur supprimé.')
      } catch (e: unknown) {
        const msg = errorMessageFromUnknown(e, 'Erreur lors de la suppression du fournisseur.')
        setError(msg)
        toast.error(msg)
      }
    }
  }

  const handlePrint = async () => {
    try {
      await downloadReport('suppliers')
      toast.success('Rapport PDF téléchargé.')
    } catch {
      toast.error("Erreur lors de l'impression du rapport.")
    }
  }

  return (
    <div className="space-y-6">
      {error || apiError || printError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? apiError ?? printError}
        </div>
      ) : null}

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
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            type="button"
            onClick={handlePrint}
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            title="Imprimer"
            disabled={printLoading}
          >
            <PrintIcon className="h-5 w-5" />
          </Button>
          <div
            className="inline-flex rounded border border-gray-200 bg-gray-50 p-0.5"
            role="group"
            aria-label="Mode d’affichage"
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={[
                'inline-flex items-center gap-1.5 rounded px-3 py-2 text-sm font-medium transition-colors',
                viewMode === 'cards'
                  ? 'bg-white text-[var(--color-primary)] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              ].join(' ')}
              aria-pressed={viewMode === 'cards'}
              title="Vue cartes"
            >
              <ViewCardsIcon className="h-5 w-5" />
              Cartes
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={[
                'inline-flex items-center gap-1.5 rounded px-3 py-2 text-sm font-medium transition-colors',
                viewMode === 'table'
                  ? 'bg-white text-[var(--color-primary)] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              ].join(' ')}
              aria-pressed={viewMode === 'table'}
              title="Vue tableau"
            >
              <ViewTableIcon className="h-5 w-5" />
              Tableau
            </button>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={openAdd}
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            disabled={loading}
          >
            <PlusIcon className="h-5 w-5" />
            Ajouter un fournisseur
          </Button>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <>
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
                        className="p-1.5 text-gray-500 cursor-pointer  hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-50"
                        aria-label="Modifier"
                        disabled={loading}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-red-500 cursor-pointer hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50"
                        aria-label="Supprimer"
                        disabled={loading}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {(s.email || s.phone || s.contact) ? (
                    <p className="text-sm text-gray-500">
                      {[s.email, s.phone, s.contact].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-gray-500">
                    Ajouté le {s.createdAt ? formatDate(s.createdAt) : 'Date inconnue'}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--color-primary)]">
                    {s.email || s.phone || s.contact ? 'Contact renseigné' : 'Aucun contact'}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {filteredSuppliers.length === 0 && (
            <div className="border border-gray-200 bg-white py-16 text-center">
              {suppliers.length === 0 && loading ? (
                <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                  <BeatLoader size={10} color="var(--color-primary)" />
                </span>
              ) : (
                <p className="text-gray-500">
                  {suppliers.length === 0
                    ? 'Aucun fournisseur. Cliquez sur « Ajouter un fournisseur » pour commencer.'
                    : 'Aucun résultat pour cette recherche.'}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <Table columns={['Nom', 'Adresse', 'Email', 'Téléphone', 'Contact', "Date d'ajout", 'Actions']}>
          {filteredSuppliers.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
              <td className="px-4 py-3 text-gray-600">
                {s.address || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {s.email || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {s.phone || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {s.contact || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {s.createdAt ? formatDate(s.createdAt) : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="p-1.5 text-gray-500 cursor-pointer hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-50"
                    aria-label="Modifier"
                    disabled={loading}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 text-red-500 cursor-pointer hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50"
                    aria-label="Supprimer"
                    disabled={loading}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {filteredSuppliers.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                {suppliers.length === 0 && loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : suppliers.length === 0 ? (
                  'Aucun fournisseur. Cliquez sur « Ajouter un fournisseur » pour commencer.'
                ) : (
                  'Aucun résultat pour cette recherche.'
                )}
              </td>
            </tr>
          )}
        </Table>
      )}

      {/* Modal formulaire ksk*/}
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
                placeholder="Personne de contact"
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemple.com"
              />
              <Input
                label="Téléphone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 ..."
              />
              <Input
                label="Adresse"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Adresse du fournisseur"
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
