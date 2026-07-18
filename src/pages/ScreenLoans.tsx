import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { BeatLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useAssets } from '../api/hooks/useAssets'
import { useImpression } from '../api/hooks/useImpression'
import { useScreenLoans } from '../api/hooks/useScreenLoans'
import { formatBrandModel, getDepartmentName, getTypeName } from '../lib/asset-labels'
import { formatDate } from '../lib/format'
import type { Asset, ScreenLoan, ScreenLoanStatus } from '../types'
import { StatusBadge } from '../components/Badge'
import { DrawerScreenLoan } from '../components/drawers/DrawerScreenLoan'
import { Button, Card, Input, PageTitle, Select, Table } from '../components/Ui'

const SCREEN_LOAN_STATUS_LABELS: Record<ScreenLoanStatus, string> = {
  NOT_RETURNED: 'Non retourné',
  RETURNED: 'Retourné',
}

type CalendarValue = Date | null | [Date | null, Date | null]
type LoanDateFilterField = 'loanDate' | 'expectedReturnDate' | 'returnedAt'

const LOAN_DATE_FILTER_LABELS: Record<LoanDateFilterField, string> = {
  loanDate: 'Date de prêt',
  expectedReturnDate: 'Retour prévu',
  returnedAt: 'Retour réel',
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

function borrowerFullName(loan: ScreenLoan): string {
  return [loan.borrowerLastName, loan.borrowerFirstName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
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
  return `${asset.inventoryNumber} - ${formatBrandModel(asset)}`
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function selectedCalendarRange(value: CalendarValue) {
  if (!value) return null
  if (Array.isArray(value)) {
    const [rawStart, rawEnd] = value
    const start = rawStart ?? rawEnd
    const end = rawEnd ?? rawStart
    if (!start || !end) return null
    return { start: startOfDay(start), end: endOfDay(end) }
  }
  return { start: startOfDay(value), end: endOfDay(value) }
}

function calendarRangeLabel(value: CalendarValue) {
  const range = selectedCalendarRange(value)
  if (!range) return 'Choisir une période'
  const start = formatDate(range.start.toISOString())
  const end = formatDate(range.end.toISOString())
  return start === end ? start : `${start} - ${end}`
}

function loanDateValue(loan: ScreenLoan, field: LoanDateFilterField) {
  return loan[field]
}

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 9V4h12v5M6 18h12v2H6v-2zm12-3h1a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2h1m12 0H6v-4h12v4z"
      />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"
      />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

export function ScreenLoansPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loans, setLoans] = useState<ScreenLoan[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | ScreenLoanStatus>('')
  // const [statusFilter, setStatusFilter] = useState<'' | ScreenLoanStatus>('NOT_RETURNED')
  const [dateFilterField, setDateFilterField] = useState<LoanDateFilterField>('loanDate')
  const [dateRange, setDateRange] = useState<CalendarValue>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const calendarFilterRef = useRef<HTMLDivElement | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { fetchAssets, loading: assetsLoading, error: assetsError } = useAssets()
  const {
    fetchScreenLoans,
    createScreenLoan,
    markScreenLoanReturned,
    loading: loansLoading,
    error: loansError,
  } = useScreenLoans()
  const {
    downloadReport,
    downloadScreenLoanReport,
    loading: printLoading,
    error: printError,
  } = useImpression()

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

  useEffect(() => {
    if (!calendarOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (calendarFilterRef.current?.contains(target)) return
      setCalendarOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCalendarOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [calendarOpen])

  const filteredLoans = useMemo(() => {
    const query = normalizeText(searchTerm.trim())
    const dateFilterRange = selectedCalendarRange(dateRange)

    return loans
      .filter((loan) => {
        if (!statusFilter) return true
        return loanStatus(loan) === statusFilter
      })
      .filter((loan) => {
        if (!dateFilterRange) return true
        const rawDate = loanDateValue(loan, dateFilterField)
        if (!rawDate) return false
        const date = new Date(rawDate)
        if (Number.isNaN(date.getTime())) return false
        return date.getTime() >= dateFilterRange.start.getTime() && date.getTime() <= dateFilterRange.end.getTime()
      })
      .filter((loan) => {
        if (!query) return true
        const asset = loan.asset ?? assetsById.get(loan.assetId)
        const searchable = [
          loan.borrowerLastName,
          loan.borrowerFirstName,
          getDepartmentName(loan),
          loan.note ?? '',
          asset?.inventoryNumber ?? '',
          getTypeName(asset),
          formatBrandModel(asset),
        ]
          .join(' ')
          .toLowerCase()
        return normalizeText(searchable).includes(query)
      })
  }, [assetsById, dateFilterField, dateRange, loans, searchTerm, statusFilter])

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

  async function handlePrintAll() {
    try {
      await downloadReport('screenLoans')
      toast.success('Rapport des emprunts telecharge.')
    } catch {
      toast.error("Erreur lors de l'impression des emprunts.")
    }
  }

  async function handlePrintLoan(loanId: number) {
    try {
      await downloadScreenLoanReport(loanId)
      toast.success('Fiche emprunt telechargee.')
    } catch {
      toast.error("Erreur lors de l'impression de l'emprunt.")
    }
  }

  function handleDateRangeChange(nextValue: CalendarValue) {
    setDateRange(nextValue)
    if (Array.isArray(nextValue) && nextValue[0] && nextValue[1]) {
      setCalendarOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Emprunts de matériel</PageTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
            title="Imprimer tous les emprunts"
            aria-label="Imprimer tous les emprunts"
            onClick={handlePrintAll}
            disabled={printLoading}
          >
            <PrintIcon className="h-5 w-5" />
          </Button>
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

      {error ?? assetsError ?? loansError ?? printError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error ?? assetsError ?? loansError ?? printError}
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
          <div className="md:col-span-4 lg:col-span-2">
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
          <div className="md:col-span-8 lg:col-span-4">
            <Input
              label="Rechercher"
              placeholder="Emprunteur, direction, note, inventaire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 lg:col-span-2">
            <Select
              label="Date"
              value={dateFilterField}
              onChange={(e) => setDateFilterField(e.target.value as LoanDateFilterField)}
            >
              {Object.entries(LOAN_DATE_FILTER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div ref={calendarFilterRef} className="relative md:col-span-8 lg:col-span-4">
            <div className="mb-1 text-xs font-medium text-gray-600">Période</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="default"
                className="h-[38px] min-w-0 flex-1 cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                title={`Filtrer par ${LOAN_DATE_FILTER_LABELS[dateFilterField].toLowerCase()}`}
                aria-label={`Filtrer par ${LOAN_DATE_FILTER_LABELS[dateFilterField].toLowerCase()}`}
                onClick={() => setCalendarOpen((value) => !value)}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{calendarRangeLabel(dateRange)}</span>
              </Button>
              {dateRange ? (
                <Button
                  type="button"
                  variant="default"
                  className="h-[38px] min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                  title="Effacer le filtre date"
                  aria-label="Effacer le filtre date"
                  onClick={() => {
                    setDateRange(null)
                    setCalendarOpen(false)
                  }}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            {calendarOpen ? (
              <div className="absolute right-0 z-30 mt-2 rounded border border-gray-200 bg-white p-2 shadow-lg">
                <Calendar
                  value={dateRange}
                  onChange={(nextValue) => handleDateRangeChange(nextValue as CalendarValue)}
                  selectRange
                  allowPartialRange
                  locale="fr-FR"
                />
              </div>
            ) : null}
          </div>
          {/* <div className="md:col-span-12 lg:col-span-2">
            <Button
              type="button"
              variant="default"
              className="w-full cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
              onClick={load}
              disabled={loading}
            >
              Actualiser
            </Button>
          </div> */}
        </div>

        <Table columns={['Matériel', 'État matériel', 'Emprunteur', 'Direction', 'Date prêt', 'Retour prévu', 'Statut', 'Note', 'Retour réel', 'Action']}>
          {filteredLoans.map((loan) => {
            const asset = loan.asset ?? assetsById.get(loan.assetId)
            const overdue = isOverdue(loan)
            return (
              <tr key={loan.id} className="hover:bg-gray-50">
                <td className="border-b border-slate-100 px-3 py-2 font-medium text-[13px]">
                  {assetLabel(asset, loan.assetId)}
                  {getTypeName(asset) !== '—' ? (
                    <div className="mt-0.5 text-xs font-normal text-gray-500">{getTypeName(asset)}</div>
                  ) : null}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  {asset ? <StatusBadge status={asset.status} /> : '—'}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-[13px] text-gray-700">
                  {borrowerFullName(loan) || '—'}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-[13px] text-gray-700">
                  {getDepartmentName(loan)}
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
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="default"
                      className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
                      title="Imprimer cet emprunt"
                      aria-label={`Imprimer l'emprunt ${loan.id}`}
                      onClick={() => handlePrintLoan(loan.id)}
                      disabled={printLoading}
                    >
                      <PrintIcon className="h-4 w-4" />
                    </Button>
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
                  </div>
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
