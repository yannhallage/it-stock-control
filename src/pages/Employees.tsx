import { useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { Button, Input, Table } from '../components/Ui'
import { errorMessageFromUnknown } from '../lib/errors'
import { formatEmployeeName } from '../lib/asset-labels'
import { useEmployees, type Employee } from '../api/hooks/useEmployees'

export function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  const {
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    loading,
    error: apiError,
  } = useEmployees()

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter((employee) => {
      const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase()
      const mail = (employee.email ?? '').toLowerCase()
      return fullName.includes(q) || mail.includes(q)
    })
  }, [items, search])

  const openAdd = () => {
    setEditingId(null)
    setFirstName('')
    setLastName('')
    setEmail('')
    setModalOpen(true)
  }

  const openEdit = (employee: Employee) => {
    setEditingId(employee.id)
    setFirstName(employee.firstName)
    setLastName(employee.lastName)
    setEmail(employee.email ?? '')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
  }

  useEffect(() => {
    setError(null)
    fetchEmployees()
      .then(setItems)
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des employés.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const trimmedEmail = email.trim()

    if (!trimmedFirstName) {
      toast.warning('Le prénom est obligatoire.')
      return
    }
    if (!trimmedLastName) {
      toast.warning('Le nom est obligatoire.')
      return
    }

    try {
      if (editingId !== null) {
        const updated = await updateEmployee(editingId, {
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: trimmedEmail.length > 0 ? trimmedEmail : null,
        })
        setItems((prev) => prev.map((employee) => (employee.id === updated.id ? updated : employee)))
        toast.success('Employé modifié avec succès.')
      } else {
        const created = await createEmployee({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: trimmedEmail.length > 0 ? trimmedEmail : undefined,
        })
        setItems((prev) => [...prev, created])
        toast.success('Employé ajouté avec succès.')
      }
      closeModal()
    } catch (err: unknown) {
      const msg = errorMessageFromUnknown(err, "Erreur lors de l'enregistrement de l'employé.")
      setError(msg)
      toast.error(msg)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Supprimer cet employé ?')) {
      setError(null)
      try {
        await deleteEmployee(id)
        setItems((prev) => prev.filter((employee) => employee.id !== id))
        toast.success('Employé supprimé.')
      } catch (err: unknown) {
        const msg = errorMessageFromUnknown(err, "Erreur lors de la suppression de l'employé.")
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
            placeholder="Rechercher un employé (nom, prénom, email)…"
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
          Ajouter un employé
        </Button>
      </div>

      <Table columns={['Nom', 'Prénom', 'Email', 'Actions']}>
        {filteredItems.map((employee) => (
          <tr key={employee.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-medium text-gray-900">{employee.lastName}</td>
            <td className="px-4 py-3 text-gray-900">{employee.firstName}</td>
            <td className="px-4 py-3 text-gray-700">{employee.email || '—'}</td>
            <td className="px-4 py-3 float-right">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(employee)}
                  className="rounded px-2 py-1 text-xs text-gray-700 cursor-pointer hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
                  disabled={loading}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(employee.id)}
                  className="rounded px-2 py-1 text-xs text-red-600 cursor-pointer hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
                  disabled={loading}
                  title={formatEmployeeName(employee)}
                >
                  Supprimer
                </button>
              </div>
            </td>
          </tr>
        ))}
        {!filteredItems.length && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
              {items.length === 0 ? (
                loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : (
                  'Aucun employé. Cliquez sur « Ajouter un employé » pour commencer.'
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
              {editingId !== null ? 'Modifier un employé' : 'Ajouter un employé'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <Input
                label="Prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex. Awa"
              />
              <Input
                label="Nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex. Kouassi"
              />
              <Input
                label="Email (optionnel)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex. awa.kouassi@assnat.ci"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                >
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
