import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useAssignments } from '../api/hooks/useAssignments'
import { formatDate } from '../lib/format'
import type { Asset, Assignment } from '../types'
import { StatusBadge } from '../components/Badge'
import { Avatar, Button, Card, Input, PageTitle, Select, Table, Tooltip } from '../components/Ui'

type AssetRow = Asset & { activeAssignment?: Assignment | null }

export function AssignmentsPage() {
  const [items, setItems] = useState<AssetRow[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [error, setError] = useState<string | null>(null)

  const [assetId, setAssetId] = useState<number | ''>('')
  const [department, setDepartment] = useState('')
  const [users, setUsers] = useState<string[]>([''])
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState<'' | Asset['status']>('')

  const { fetchAssets, loading: assetsLoading } = useAssets()
  const {
    createAssignmentForAsset,
    endAssignment,
    fetchAllAssignments,
    loading: assignmentsLoading,
    error: apiError,
  } = useAssignments()

  const loading = assetsLoading || assignmentsLoading

  const assignable = useMemo(() => {
    return items
      .filter((a) => a.status === 'EN_STOCK')
      .slice()
      .sort((a, b) => a.inventoryNumber.localeCompare(b.inventoryNumber, 'fr', { numeric: true }))
  }, [items])

  function load() {
    setError(null)
    Promise.all([fetchAssets({ with: 'activeAssignment' }), fetchAllAssignments()])
      .then(([assetsData, assignmentsData]) => {
        setItems((assetsData as AssetRow[]) ?? [])
        setAssignments(assignmentsData ?? [])
      })
      .catch((e) => {
        const msg = String(e?.message ?? e)
        setError(msg)
        toast.error(msg || 'Erreur lors du chargement.')
      })
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!assetId) {
      toast.warning('Veuillez sélectionner un matériel.')
      return
    }
    try {
      const names = users.map((u) => u.trim()).filter(Boolean)
      if (!names.length) {
        toast.warning('Veuillez saisir au moins un utilisateur.')
        return
      }
      await createAssignmentForAsset(Number(assetId), {
        department,
        user: names.length === 1 ? { name: names[0] } : { names },
        startDate,
      })
      toast.success('Affectation créée avec succès.')
      setAssetId('')
      setDepartment('')
      setUsers([''])
      setStartDate(new Date().toISOString().slice(0, 10))
      load()
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err)
      setError(msg)
      toast.error(msg || "Erreur lors de l'affectation.")
    }
  }

  async function handleEndAssignment(id: number) {
    setError(null)
    try {
      await endAssignment(id)
      toast.success('Affectation clôturée.')
      load()
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err)
      setError(msg)
      toast.error(msg || 'Erreur lors de la clôture.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle>Affectations</PageTitle>
        <Button onClick={load} className="cursor-pointer flex items-center gap-2" disabled={loading}>
          Actualiser
        </Button>
      </div>

      {error ?? apiError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? apiError}
        </div>
      ) : null}

      <Card title="Transférer un matériel du Stock vers une Direction">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-3" onSubmit={createAssignment}>
          <Select
            label="Matériel"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Sélectionner…</option>
            {assignable.map((a) => (
              <option key={a.id} value={a.id}>
                {a.inventoryNumber} — {a.type} — {a.brand} {a.model}
              </option>
            ))}
          </Select>
          <Input
            label="Direction / Service"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
          <Input
            label="Date début"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <div className="space-y-2 md:col-span-3 max-w-md">
            <div className="mb-1 text-xs font-medium text-gray-600">Utilisateurs</div>
            {users.map((value, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  className="min-w-0 flex-1 border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  placeholder={index === 0 ? 'Nom de l\'utilisateur' : 'Autre utilisateur'}
                  value={value}
                  onChange={(e) => {
                    const next = [...users]
                    next[index] = e.target.value
                    setUsers(next)
                  }}
                />
                <Button
                  type="button"
                  variant="default"
                  className="cursor-pointer shrink-0"
                  onClick={() => {
                    if (users.length <= 1) return
                    setUsers(users.filter((_, i) => i !== index))
                  }}
                  disabled={users.length <= 1}
                  title="Supprimer"
                >
                  −
                </Button>
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="default"
                className="cursor-pointer text-sm"
                onClick={() => setUsers([...users, ''])}
              >
                + Ajouter un utilisateur
              </Button>
            </div>
          </div>
          <div className="md:col-span-3">
            <Button type="submit" className="cursor-pointer flex items-center gap-2" variant="primary" disabled={loading}>
              Affecter / transférer
            </Button>
          </div>
        </form>
        <div className="mt-3 text-xs text-slate-600">
          Une nouvelle affectation clôt automatiquement l'affectation active précédente (si existante).
        </div>
      </Card>

      <Card title="Affectations actives">
        <div className="mb-3 max-w-xs">
          <Select
            label="Filtrer par état"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '' | Asset['status'])}
          >
            <option value="">Tous</option>
            <option value="EN_STOCK">EN_STOCK</option>
            <option value="AFFECTE">AFFECTE</option>
            <option value="EN_SERVICE">EN_SERVICE</option>
            <option value="EN_PANNE">EN_PANNE</option>
            <option value="EN_REPARATION">EN_REPARATION</option>
            <option value="HORS_SERVICE">HORS_SERVICE</option>
          </Select>
        </div>
        <Table columns={['Inventaire', 'Matériel', 'État', 'Direction', 'Utilisateur', 'Date affectation', 'Action']}>
          {assignments
            .filter((a) => !a.endDate)
            .filter((a) => {
              if (!statusFilter) return true
              const asset = items.find((i) => i.id === a.assetId)
              return asset?.status === statusFilter
            })
            .map((a) => {
              const asset = items.find((i) => i.id === a.assetId)
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="border-b border-slate-100 px-3 py-2 font-medium text-gray-900">
                    {asset?.inventoryNumber ?? '—'}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {asset ? `${asset.type} — ${asset.brand} ${asset.model}` : '—'}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {asset ? <StatusBadge status={asset.status} /> : '—'}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">{a.department}</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {(() => {
                      const u = a.user
                      const names: string[] =
                        u && typeof u === 'object' && 'names' in u && Array.isArray(u.names)
                          ? u.names.filter(Boolean)
                          : u && typeof u === 'object' && 'name' in u && typeof u.name === 'string'
                            ? [u.name]
                            : typeof u === 'string'
                              ? u.split(/\s*,\s*/).map((n) => n.trim()).filter(Boolean)
                              : []
                      if (!names.length) return '—'
                      if (names.length === 1) {
                        return (
                          <span className="flex items-center gap-2">
                            <Avatar name={names[0]} size="sm" />
                            <span className="text-gray-900">{names[0]}</span>
                          </span>
                        )
                      }
                      return (
                        <span className="flex flex-wrap items-center gap-1">
                          {names.map((userName, i) => (
                            <Tooltip key={i} text={userName} placement="top">
                              <span className="inline-flex transition-transform duration-200 group-hover:-translate-y-1">
                                <Avatar name={userName} size="sm" maxLetters={1} />
                              </span>
                            </Tooltip>
                          ))}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">{formatDate(a.startDate)}</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <Button
                      onClick={() => handleEndAssignment(a.id)}
                      variant="default"
                      className="cursor-pointer"
                      disabled={loading}
                    >
                      Fin d'affectation
                    </Button>
                  </td>
                </tr>
              )
            })}
          {!assignments
            .filter((a) => !a.endDate)
            .filter((a) => {
              if (!statusFilter) return true
              const asset = items.find((i) => i.id === a.assetId)
              return asset?.status === statusFilter
            }).length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                {loading ? 'Chargement…' : 'Aucune affectation active.'}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}
