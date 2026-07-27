import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useAssignments } from '../api/hooks/useAssignments'
import { useDepartments } from '../api/hooks/useDepartments'
import { useEmployees } from '../api/hooks/useEmployees'
import { useImpression } from '../api/hooks/useImpression'
import type { Employee } from '../api/services/employees.service'
import {
  formatBrandModel,
  formatEmployeeName,
  getDepartmentName,
  getTypeName,
} from '../lib/asset-labels'
import { formatDate } from '../lib/format'
import type { Asset, Assignment } from '../types'
import { StatusBadge } from '../components/Badge'
import { DrawerAssignments } from '../components/drawers/DrawerAssignments'
import { IncidentDrawer } from '../components/drawers/IncidentDrawer'
import { Avatar, Button, Card, Input, PageTitle, Select, Table } from '../components/Ui'

type AssetRow = Asset & { activeAssignment?: Assignment | null }
type IncidentDrawerTarget = {
  assetId: number
  inventoryNumber: string
  materialName: string
  departmentId: number
  departmentName: string
  userDisplay: string
}

export function AssignmentsPage() {
  const [items, setItems] = useState<AssetRow[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState<string | null>(null)

  const [assetId, setAssetId] = useState<number | ''>('')
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [employeeId, setEmployeeId] = useState('')
  const [customEmployeeId, setCustomEmployeeId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState<'' | Asset['status']>('')
  const [departmentFilter, setDepartmentFilter] = useState<number | ''>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [incidentTarget, setIncidentTarget] = useState<IncidentDrawerTarget | null>(null)
  const [assignmentDrawerOpen, setAssignmentDrawerOpen] = useState(false)

  const { fetchAssets, loading: assetsLoading } = useAssets()
  const {
    createAssignmentForAsset,
    endAssignment,
    fetchAllAssignments,
    loading: assignmentsLoading,
    error: apiError,
  } = useAssignments()
  const { fetchDepartments } = useDepartments()
  const { fetchEmployees } = useEmployees()
  const { downloadAssignmentReport, loading: printLoading, error: printError } = useImpression()

  const loading = assetsLoading || assignmentsLoading

  const assignable = useMemo(() => {
    return items
      .filter((a) => a.status === 'EN_STOCK_NON_AFFECTE')
      .slice()
      .sort((a, b) => a.inventoryNumber.localeCompare(b.inventoryNumber, 'fr', { numeric: true }))
      .map((a) => ({
        id: a.id,
        inventoryNumber: a.inventoryNumber,
        model: a.model,
        materialType: a.materialType,
        brand: a.brand,
      }))
  }, [items])

  function load() {
    setError(null)
    Promise.all([fetchAssets(), fetchAllAssignments()])
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
    Promise.all([fetchDepartments(), fetchEmployees()])
      .then(([depts, emps]) => {
        setDepartments(depts ?? [])
        setEmployees(emps ?? [])
      })
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des données d\'affectation.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!assignmentDrawerOpen) return
    Promise.all([fetchDepartments(), fetchEmployees()])
      .then(([depts, emps]) => {
        setDepartments(depts ?? [])
        setEmployees(emps ?? [])
      })
      .catch((e) => {
        const msg = String(e?.message ?? e)
        toast.error(msg || 'Erreur lors du chargement des données d\'affectation.')
      })
  }, [assignmentDrawerOpen, fetchDepartments, fetchEmployees])

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!assetId) {
      toast.warning('Veuillez sélectionner un matériel.')
      return
    }
    const resolvedEmployeeId = employeeId.trim() || customEmployeeId.trim()
    if (!resolvedEmployeeId) {
      toast.warning('Veuillez sélectionner ou saisir un employé.')
      return
    }
    if (!departmentId) {
      toast.warning('Veuillez sélectionner une direction.')
      return
    }
    try {
      await createAssignmentForAsset(Number(assetId), {
        employeeId: resolvedEmployeeId,
        departmentId: Number(departmentId),
        startDate,
      })
      toast.success('Affectation créée avec succès.')
      setAssetId('')
      setDepartmentId('')
      setEmployeeId('')
      setCustomEmployeeId('')
      setStartDate(new Date().toISOString().slice(0, 10))
      setAssignmentDrawerOpen(false)
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageTitle>Affectations</PageTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            type="button"
            onClick={() => setAssignmentDrawerOpen(true)}
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            disabled={loading}
          >
            Transférer / affecter
          </Button>
          <Button onClick={load} className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60" disabled={loading}>
            Actualiser
          </Button>
        </div>
      </div>

      {error ?? apiError ?? printError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? apiError ?? printError}
        </div>
      ) : null}

      <DrawerAssignments
        isOpen={assignmentDrawerOpen}
        onClose={() => setAssignmentDrawerOpen(false)}
        assignable={assignable}
        departments={departments}
        employees={employees}
        assetId={assetId}
        setAssetId={setAssetId}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        employeeId={employeeId}
        setEmployeeId={setEmployeeId}
        customEmployeeId={customEmployeeId}
        setCustomEmployeeId={setCustomEmployeeId}
        startDate={startDate}
        setStartDate={setStartDate}
        loading={loading}
        onSubmit={createAssignment}
      />

      <Card title="Affectations actives">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-3 lg:col-span-2">
            <Select
              label="Filtrer par état"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as '' | Asset['status'])}
            >
              <option value="">Tous</option>
              <option value="EN_STOCK_NON_AFFECTE">EN_STOCK_NON_AFFECTE</option>
              <option value="AFFECTE">AFFECTE</option>
              <option value="EN_PRET">EN_PRET</option>
              <option value="EN_SERVICE">EN_SERVICE</option>
              <option value="EN_PANNE">EN_PANNE</option>
              <option value="EN_REPARATION">EN_REPARATION</option>
              <option value="HORS_SERVICE">HORS_SERVICE</option>
            </Select>
          </div>
          <div className="md:col-span-3 lg:col-span-3">
            <Select
              label="Direction"
              value={departmentFilter === '' ? '' : String(departmentFilter)}
              onChange={(e) =>
                setDepartmentFilter(e.target.value ? Number(e.target.value) : '')
              }
            >
              <option value="">Toutes</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-4 lg:col-span-5">
            <Input
              label="Rechercher"
              placeholder="Utilisateur, direction, inventaire, matériel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
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
              if (departmentFilter === '') return true
              return a.departmentId === departmentFilter
            })
            .filter((a) => {
              const query = searchTerm.trim().toLowerCase()
              if (!query) return true
              const asset = items.find((i) => i.id === a.assetId)
              const userName = formatEmployeeName(a.employee).toLowerCase()
              const searchable = [
                asset?.inventoryNumber ?? '',
                getTypeName(asset),
                formatBrandModel(asset),
                getDepartmentName(a),
                userName,
              ]
                .join(' ')
                .toLowerCase()
              return searchable.includes(query)
            })
            .map((a) => {
              const asset = items.find((i) => i.id === a.assetId)
              const userName = formatEmployeeName(a.employee)
              const avatarName = userName === '—' ? '?' : userName
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="border-b border-slate-100 px-3 py-2 font-medium text-[13px]">
                    {asset?.inventoryNumber ?? '—'}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-[13px]">
                    {asset ? `${getTypeName(asset)} — ${formatBrandModel(asset)}` : '—'}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {asset ? <StatusBadge status={asset.status} /> : '—'}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-[13px]">{getDepartmentName(a)}</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {userName === '—' ? (
                      '—'
                    ) : (
                      <span className="flex items-center gap-2">
                        <Avatar name={avatarName} size="sm" />
                        <span className="text-gray-900">{userName}</span>
                      </span>
                    )}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">{formatDate(a.startDate)}</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        onClick={async () => {
                          try {
                            await downloadAssignmentReport(a.id)
                            toast.success('Rapport PDF téléchargé.')
                          } catch {
                            toast.error("Erreur lors de l'impression du rapport.")
                          }
                        }}
                        variant="default"
                        className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                        disabled={loading || printLoading}
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
                            materialName: asset ? `${getTypeName(asset)} — ${formatBrandModel(asset)}` : '—',
                            departmentId: a.departmentId,
                            departmentName: getDepartmentName(a),
                            userDisplay: userName,
                          })
                        }
                        variant="danger"
                        className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                        disabled={loading || asset?.status === 'EN_REPARATION' || asset?.status === 'EN_PANNE'}
                        title={
                          asset?.status === 'EN_REPARATION'
                            ? 'Matériel déjà en réparation'
                            : asset?.status === 'EN_PANNE'
                              ? 'Matériel déjà déclaré en panne'
                              : 'Déclarer une panne'
                        }
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path
                            fillRule="evenodd"
                            d="M8.258 3.099c.765-1.36 2.719-1.36 3.484 0l6.518 11.595c.75 1.334-.213 2.99-1.742 2.99H1.742c-1.53 0-2.492-1.656-1.742-2.99L6.518 3.1Zm1.742 3.4a.75.75 0 0 0-.75.75v4a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-.75-.75Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                            clipRule="evenodd"
                          />
                        </svg>
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
              const userName = formatEmployeeName(a.employee).toLowerCase()
              const searchable = [
                asset?.inventoryNumber ?? '',
                getTypeName(asset),
                formatBrandModel(asset),
                getDepartmentName(a),
                userName,
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
        departmentId={incidentTarget?.departmentId ?? null}
        departmentName={incidentTarget?.departmentName ?? ''}
        userDisplay={incidentTarget?.userDisplay ?? ''}
      />
    </div>
  )
}
