import { useCallback, useEffect, useMemo, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useScreenLoans } from '../api/hooks/useScreenLoans'
import { formatDate } from '../lib/format'
import type { Asset, ScreenLoan, ScreenLoanStatus } from '../types'
import { StatusBadge } from '../components/Badge'
import { DrawerScreenLoan } from '../components/drawers/DrawerScreenLoan'
import { Button, Card, Input, PageTitle, Select, Table } from '../components/Ui'

const SCREEN_LOAN_STATUS_LABELS: Record<ScreenLoanStatus, string> = {
  NOT_RETURNED: 'Non retourné',
  RETURNED: 'Retourné',
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function loanStatus(loan: ScreenLoan): ScreenLoanStatus {
  return loan.returnedAt ? 'RETURNED' : 'NOT_RETURNED'
}

function isOverdue(loan: ScreenLoan) {
  if (loan.returnedAt) return false
  const expected = new Date(loan.expectedReturnDate)
  if (Number.isNaN(expected.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expected.setHours(0, 0, 0, 0)
  return expected.getTime() < today.getTime()
}

function ScreenLoanBadge({ loan }: { loan: ScreenLoan }) {
  const status = loanStatus(loan)
  const overdue = isOverdue(loan)
  const className =
    status === 'RETURNED'
      ? 'bg-emerald-100 text-emerald-800'
      : overdue
        ? 'bg-red-100 text-red-800'
        : 'bg-amber-100 text-amber-800'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'RETURNED' ? 'bg-emerald-500' : overdue ? 'bg-red-500' : 'bg-amber-500'}`} />
      {overdue ? 'Non retourné - en retard' : SCREEN_LOAN_STATUS_LABELS[status]}
    </span>
  )
}

function assetLabel(asset: Asset | ScreenLoan['asset'] | undefined, fallbackId: number) {
  if (!asset) return `#${fallbackId}`
  return `${asset.inventoryNumber} - ${asset.brand} ${asset.model}`
}

export function ScreenLoansPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loans, setLoans] = useState<ScreenLoan[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | ScreenLoanStatus>('NOT_RETURNED')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { fetchAssets, loading: assetsLoading, error: assetsError } = useAssets()
  const {
    fetchScreenLoans,
    createScreenLoan,
    markScreenLoanReturned,
    loading: loansLoading,
    error: loansError,
  } = useScreenLoans()

  const loading = assetsLoading || loansLoading

  const assetsById = useMemo(() => {
    const map = new Map<number, Asset>()
    for (const asset of assets) map.set(asset.id, asset)
    return map
  }, [assets])

  const loanableAssets = useMemo(
    () =>
      assets
        .filter((asset) => asset.status === 'EN_STOCK_NON_AFFECTE' || asset.status === 'EN_PRET')
        .slice()
        .sort((a, b) => a.inventoryNumber.localeCompare(b.inventoryNumber, 'fr', { numeric: true })),
    [assets],
  )

  const activeLoanAssetIds = useMemo(
    () => new Set(loans.filter((loan) => !loan.returnedAt).map((loan) => loan.assetId)),
    [loans],
  )

  const load = useCallback(() => {
    setError(null)
    Promise.all([fetchAssets(), fetchScreenLoans()])
      .then(([assetsData, loansData]) => {
        setAssets(assetsData ?? [])
        setLoans(loansData ?? [])
      })
      .catch((e) => {
        const msg = String(e?.message ?? e)
        setError(msg)
        toast.error(msg || 'Erreur lors du chargement.')
      })
  }, [fetchAssets, fetchScreenLoans])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const filteredLoans = useMemo(() => {
    const query = normalizeText(searchTerm.trim())

    return loans
      .filter((loan) => {
        if (!statusFilter) return true
        return loanStatus(loan) === statusFilter
      })
      .filter((loan) => {
        if (!query) return true
        const asset = loan.asset ?? assetsById.get(loan.assetId)
        const searchable = [
          loan.borrowerName,
          loan.borrowerDepartment ?? '',
          loan.note ?? '',
          asset?.inventoryNumber ?? '',
          asset?.type ?? '',
          asset?.brand ?? '',
          asset?.model ?? '',
        ]
          .join(' ')
          .toLowerCase()
        return normalizeText(searchable).includes(query)
      })
  }, [assetsById, loans, searchTerm, statusFilter])

  const activeLoansCount = loans.filter((loan) => !loan.returnedAt).length
  const returnedLoansCount = loans.filter((loan) => Boolean(loan.returnedAt)).length
  const overdueLoansCount = loans.filter(isOverdue).length

  async function handleMarkReturned(loanId: number) {
    setError(null)
    try {
      await markScreenLoanReturned(loanId)
      toast.success('Matériel marqué comme retourné.')
      load()
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err)
      setError(msg)
      toast.error(msg || 'Erreur lors du retour du matériel.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Emprunts de matériel</PageTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            onClick={() => setDrawerOpen(true)}
            disabled={loading}
          >
            Enregistrer un emprunt
          </Button>
          <Button
            type="button"
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            onClick={load}
            disabled={loading}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {error ?? assetsError ?? loansError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? assetsError ?? loansError}
        </div>
      ) : null}

      <DrawerScreenLoan
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={load}
        assets={loanableAssets}
        activeLoanAssetIds={activeLoanAssetIds}
        createScreenLoan={createScreenLoan}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500">Non retournés</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{activeLoansCount}</div>
        </div>
        <div className="border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500">Retournés</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{returnedLoansCount}</div>
        </div>
        <div className="border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500">Retards</div>
          <div className="mt-1 text-2xl font-semibold text-red-700">{overdueLoansCount}</div>
        </div>
      </div>

      <Card title="Suivi des emprunts">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-4 lg:col-span-3">
            <Select
              label="Statut"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as '' | ScreenLoanStatus)}
            >
              <option value="">Tous</option>
              <option value="NOT_RETURNED">Non retourné</option>
              <option value="RETURNED">Retourné</option>
            </Select>
          </div>
          <div className="md:col-span-8 lg:col-span-7">
            <Input
              label="Rechercher"
              placeholder="Emprunteur, direction, note, inventaire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="md:col-span-12 lg:col-span-2">
            <Button
              type="button"
              variant="default"
              className="w-full cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
              onClick={load}
              disabled={loading}
            >
              Actualiser
            </Button>
          </div>
        </div>

        <Table columns={['Matériel', 'État matériel', 'Emprunteur', 'Direction', 'Date prêt', 'Retour prévu', 'Statut', 'Note', 'Retour réel', 'Action']}>
          {filteredLoans.map((loan) => {
            const asset = loan.asset ?? assetsById.get(loan.assetId)
            const overdue = isOverdue(loan)
            return (
              <tr key={loan.id} className="hover:bg-gray-50">
                <td className="border-b border-slate-100 px-3 py-2 font-medium text-[13px]">
                  {assetLabel(asset, loan.assetId)}
                  {asset?.type ? <div className="mt-0.5 text-xs font-normal text-gray-500">{asset.type}</div> : null}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  {asset ? <StatusBadge status={asset.status} /> : '—'}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-[13px] text-gray-700">
                  {loan.borrowerName}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-[13px] text-gray-700">
                  {loan.borrowerDepartment || '—'}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-[13px] text-gray-700">
                  {formatDate(loan.loanDate) || '—'}
                </td>
                <td className={`border-b border-slate-100 px-3 py-2 text-[13px] ${overdue ? 'font-medium text-red-700' : 'text-gray-700'}`}>
                  {formatDate(loan.expectedReturnDate) || '—'}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <ScreenLoanBadge loan={loan} />
                </td>
                <td className="max-w-[220px] border-b border-slate-100 px-3 py-2 text-[13px] text-gray-700">
                  <span className="block truncate" title={loan.note || undefined}>
                    {loan.note || '—'}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-[13px] text-gray-700">
                  {formatDate(loan.returnedAt) || '—'}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  {loan.returnedAt ? (
                    <span className="inline-flex rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      Retourné
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="default"
                      className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                      onClick={() => handleMarkReturned(loan.id)}
                      disabled={loading}
                    >
                      Marquer retourné
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
          {!filteredLoans.length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={10}>
                {loading ? (
                  <span className="inline-flex w-full items-center justify-center" aria-label="Chargement">
                    <BeatLoader size={10} color="var(--color-primary)" />
                  </span>
                ) : (
                  'Aucun emprunt de matériel.'
                )}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}
