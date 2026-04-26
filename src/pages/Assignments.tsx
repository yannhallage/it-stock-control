import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useAssignments } from '../api/hooks/useAssignments'
import { formatDate } from '../lib/format'
import type { Asset, Assignment } from '../types'
import { StatusBadge } from '../components/Badge'
import { IncidentDrawer } from '../components/drawerPanne/IncidentDrawer'
import { Avatar, Button, Card, Input, PageTitle, Select, Table, Tooltip } from '../components/Ui'

type AssetRow = Asset & { activeAssignment?: Assignment | null }
type IncidentDrawerTarget = {
  assetId: number
  inventoryNumber: string
  materialName: string
  department: string
  userDisplay: string
}

export function AssignmentsPage() {
  const [items, setItems] = useState<AssetRow[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [error, setError] = useState<string | null>(null)

  const [assetId, setAssetId] = useState<number | ''>('')
  const [department, setDepartment] = useState('')
  const [users, setUsers] = useState<string[]>([''])
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState<'' | Asset['status']>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [incidentTarget, setIncidentTarget] = useState<IncidentDrawerTarget | null>(null)

  const { fetchAssets, loading: assetsLoading } = useAssets()
  const {
    createAssignmentForAsset,
    endAssignment,
    fetchAllAssignments,
    loading: assignmentsLoading,
    error: apiError,
  } = useAssignments()

  const loading = assetsLoading || assignmentsLoading

  function getAssignmentUserNames(assignment: Assignment): string[] {
    const u = assignment.user
    return u && typeof u === 'object' && 'names' in u && Array.isArray(u.names)
      ? u.names.filter(Boolean)
      : u && typeof u === 'object' && 'name' in u && typeof u.name === 'string'
        ? [u.name]
        : typeof u === 'string'
          ? u.split(/\s*,\s*/).map((n) => n.trim()).filter(Boolean)
          : []
  }

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
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-4 lg:col-span-3">
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
          <div className="md:col-span-8 lg:col-span-7">
            <Input
              label="Rechercher"
              placeholder="Utilisateur, direction, inventaire, matériel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="md:col-span-12 lg:col-span-2">
            <Button
              type="button"
              variant="default"
              className="w-full cursor-pointer flex items-center justify-center gap-2"
              onClick={load}
              disabled={loading}
            >
              <span aria-hidden="true">↻</span>
              Actualiser
            </Button>
          </div>
        </div>
        <Table columns={['Inventaire', 'Matériel', 'État', 'Direction', 'Utilisateur', 'Date affectation', 'Action']}>
          {assignments
            .filter((a) => !a.endDate)
            .filter((a) => {
              if (!statusFilter) return true
              const asset = items.find((i) => i.id === a.assetId)
              return asset?.status === statusFilter
            })
            .filter((a) => {
              const query = searchTerm.trim().toLowerCase()
              if (!query) return true
              const asset = items.find((i) => i.id === a.assetId)
              const userNames = getAssignmentUserNames(a).join(' ').toLowerCase()
              const searchable = [
                asset?.inventoryNumber ?? '',
                asset?.type ?? '',
                asset?.brand ?? '',
                asset?.model ?? '',
                a.department ?? '',
                userNames,
              ]
                .join(' ')
                .toLowerCase()
              return searchable.includes(query)
            })
            .map((a) => {
              const asset = items.find((i) => i.id === a.assetId)
              const names = getAssignmentUserNames(a)
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        onClick={() => window.print()}
                        variant="default"
                        className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                        disabled={loading}
                        title="Imprimer"
                        aria-label="Imprimer"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M5 2.5A1.5 1.5 0 0 1 6.5 1h7A1.5 1.5 0 0 1 15 2.5V5h.5A2.5 2.5 0 0 1 18 7.5v5a2.5 2.5 0 0 1-2.5 2.5H15v2.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 17.5V15h-.5A2.5 2.5 0 0 1 2 12.5v-5A2.5 2.5 0 0 1 4.5 5H5V2.5Zm1.5 0V5h7V2.5h-7Zm7 9.5h-7v5h7v-5Zm1-3a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                        </svg>
                      </Button>
                      <Button
                        onClick={() =>
                          setIncidentTarget({
                            assetId: a.assetId,
                            inventoryNumber: asset?.inventoryNumber ?? `#${a.assetId}`,
                            materialName: asset ? `${asset.type} — ${asset.brand} ${asset.model}` : '—',
                            department: a.department || '—',
                            userDisplay: names.length ? names.join(', ') : '—',
                          })
                        }
                        variant="danger"
                        className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                        disabled={loading || asset?.status === 'EN_REPARATION'}
                        title={asset?.status === 'EN_REPARATION' ? 'Matériel déjà en réparation' : 'Déclarer une panne'}
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path
                            fillRule="evenodd"
                            d="M8.258 3.099c.765-1.36 2.719-1.36 3.484 0l6.518 11.595c.75 1.334-.213 2.99-1.742 2.99H1.742c-1.53 0-2.492-1.656-1.742-2.99L6.518 3.1Zm1.742 3.4a.75.75 0 0 0-.75.75v4a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-.75-.75Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {/* Déclarer panne */}
                      </Button>
                      <Button
                        onClick={() => handleEndAssignment(a.id)}
                        variant="default"
                        className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                        disabled={loading}
                        title="Clôturer l'affectation"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path
                            fillRule="evenodd"
                            d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.24 7.3a1 1 0 0 1-1.43-.003l-3.75-3.8a1 1 0 1 1 1.423-1.404l3.039 3.077 6.532-6.584a1 1 0 0 1 1.42 0Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Fin d'affectation
                      </Button>
                    </div>
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
            })
            .filter((a) => {
              const query = searchTerm.trim().toLowerCase()
              if (!query) return true
              const asset = items.find((i) => i.id === a.assetId)
              const userNames = getAssignmentUserNames(a).join(' ').toLowerCase()
              const searchable = [
                asset?.inventoryNumber ?? '',
                asset?.type ?? '',
                asset?.brand ?? '',
                asset?.model ?? '',
                a.department ?? '',
                userNames,
              ]
                .join(' ')
                .toLowerCase()
              return searchable.includes(query)
            }).length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                {loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : (
                  'Aucune affectation active.'
                )}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>

      <IncidentDrawer
        isOpen={incidentTarget != null}
        onClose={() => setIncidentTarget(null)}
        onCreated={load}
        assetId={incidentTarget?.assetId ?? null}
        inventoryNumber={incidentTarget?.inventoryNumber ?? ''}
        materialName={incidentTarget?.materialName ?? ''}
        department={incidentTarget?.department ?? ''}
        userDisplay={incidentTarget?.userDisplay ?? ''}
      />
    </div>
  )
}
