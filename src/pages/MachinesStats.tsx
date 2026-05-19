import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { get } from '../api/http'
import { ENDPOINTS } from '../api/endpoints'
import { formatDate } from '../lib/format'
import type { MachinesStatsGranularity, MachinesStatsPoint } from '../types'
import { Button, Card, PageTitle, Table } from '../components/Ui'

type SeriesKey =
  | 'assetsCreated'
  | 'assignmentsCreated'
  | 'loansCreated'
  | 'loansReturned'
  | 'repairsStarted'
  | 'repairsFinished'

const GRANULARITY_LABELS: Record<MachinesStatsGranularity, string> = {
  week: 'Semaine',
  month: 'Mois',
  year: 'Année',
}

const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: 'assetsCreated', label: 'Enregistrées', color: '#16a34a' },
  { key: 'assignmentsCreated', label: 'Affectations', color: '#2563eb' },
  { key: 'loansCreated', label: 'Emprunts', color: '#9333ea' },
  { key: 'loansReturned', label: 'Retours', color: '#0f766e' },
  { key: 'repairsStarted', label: 'Réparations démarrées', color: '#ea580c' },
  { key: 'repairsFinished', label: 'Réparations terminées', color: '#64748b' },
]

function formatPeriodLabel(value: string, granularity: MachinesStatsGranularity) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  if (granularity === 'week') return `Semaine du ${formatDate(value)}`
  if (granularity === 'month') {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }
  return String(date.getFullYear())
}

function numberLabel(value: number) {
  return value.toLocaleString('fr-FR')
}

function SummaryCard({
  label,
  value,
  footer,
}: {
  label: string
  value: string | number
  footer: string
}) {
  return (
    <div className="border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">
        {typeof value === 'number' ? numberLabel(value) : value}
      </div>
      <div className="mt-1 text-xs text-gray-500">{footer}</div>
    </div>
  )
}

function MachinesActivityChart({
  points,
  granularity,
  loading,
}: {
  points: MachinesStatsPoint[]
  granularity: MachinesStatsGranularity
  loading: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || loading || !points.length) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current)
    }
    const chart = chartRef.current
    const labels = points.map((point) => formatPeriodLabel(point.periodStart, granularity))

    const option: EChartsOption = {
      color: SERIES.map((serie) => serie.color),
      animation: true,
      animationDuration: 900,
      animationEasing: 'cubicOut',
      grid: { left: 48, right: 24, top: 48, bottom: 64, containLabel: true },
      legend: {
        top: 0,
        type: 'scroll',
        textStyle: { fontSize: 11 },
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          rotate: labels.some((label) => label.length > 12) ? 25 : 0,
        },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#e5e7eb' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: SERIES.map((serie, index) => ({
        name: serie.label,
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: points.map((point) => point[serie.key]),
        animationDelay: index * 100,
        emphasis: { focus: 'series' },
      })),
    }

    chart.setOption(option, true)

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [granularity, loading, points])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  if (loading) {
    return <div className="flex h-[340px] items-center justify-center text-gray-500">Chargement…</div>
  }

  if (!points.length) {
    return <div className="flex h-[340px] items-center justify-center text-gray-500">Aucune donnée.</div>
  }

  return <div ref={containerRef} className="h-[340px] w-full min-w-0" />
}

export function MachinesStatsPage() {
  const [granularity, setGranularity] = useState<MachinesStatsGranularity>('month')
  const [points, setPoints] = useState<MachinesStatsPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const query = new URLSearchParams({ granularity }).toString()
    setLoading(true)
    setError(null)
    get<MachinesStatsPoint[]>(`${ENDPOINTS.dashboard}/machines-stats?${query}`)
      .then((data) => {
        if (!cancelled) setPoints(data ?? [])
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setPoints([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [granularity])

  const summary = useMemo(() => {
    const totals = points.reduce(
      (acc, point) => {
        acc.assetsCreated += point.assetsCreated
        acc.stockMovements += point.assignmentsCreated + point.loansCreated + point.loansReturned
        acc.repairs += point.repairsStarted + point.repairsFinished
        acc.totalActivity += point.totalActivity
        return acc
      },
      { assetsCreated: 0, stockMovements: 0, repairs: 0, totalActivity: 0 },
    )

    const busiest = points.reduce<MachinesStatsPoint | null>((current, point) => {
      if (!current || point.totalActivity > current.totalActivity) return point
      return current
    }, null)

    return { totals, busiest }
  }, [points])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Statistiques machines</PageTitle>
        <div className="flex items-center gap-2">
          {(Object.keys(GRANULARITY_LABELS) as MachinesStatsGranularity[]).map((value) => (
            <Button
              key={value}
              type="button"
              variant={granularity === value ? 'primary' : 'default'}
              className="h-7 min-w-[34px] cursor-pointer rounded px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
              onClick={() => setGranularity(value)}
              disabled={loading && granularity === value}
            >
              {GRANULARITY_LABELS[value]}
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Machines enregistrées"
          value={summary.totals.assetsCreated}
          footer={`Total sur l'affichage par ${GRANULARITY_LABELS[granularity].toLowerCase()}`}
        />
        <SummaryCard
          label="Mouvements de stock"
          value={summary.totals.stockMovements}
          footer="Affectations, emprunts et retours"
        />
        <SummaryCard
          label="Réparations"
          value={summary.totals.repairs}
          footer="Démarrées et terminées"
        />
        <SummaryCard
          label="Période la plus active"
          value={summary.busiest && summary.busiest.totalActivity > 0 ? formatPeriodLabel(summary.busiest.periodStart, granularity) : '—'}
          footer={
            summary.busiest && summary.busiest.totalActivity > 0
              ? `${numberLabel(summary.busiest.totalActivity)} opérations`
              : 'Aucune activité'
          }
        />
      </div>

      <Card title="Évolution de l'activité">
        <MachinesActivityChart points={points} granularity={granularity} loading={loading} />
      </Card>

      <Card title="Détail par période">
        <Table
          columns={[
            'Période',
            'Enregistrées',
            'Affectations',
            'Emprunts',
            'Retours',
            'Réparations démarrées',
            'Réparations terminées',
            'Total activité',
          ]}
        >
          {points.map((point) => (
            <tr key={point.periodStart} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{formatPeriodLabel(point.periodStart, granularity)}</td>
              <td className="px-4 py-3 text-gray-600">{numberLabel(point.assetsCreated)}</td>
              <td className="px-4 py-3 text-gray-600">{numberLabel(point.assignmentsCreated)}</td>
              <td className="px-4 py-3 text-gray-600">{numberLabel(point.loansCreated)}</td>
              <td className="px-4 py-3 text-gray-600">{numberLabel(point.loansReturned)}</td>
              <td className="px-4 py-3 text-gray-600">{numberLabel(point.repairsStarted)}</td>
              <td className="px-4 py-3 text-gray-600">{numberLabel(point.repairsFinished)}</td>
              <td className="px-4 py-3 font-semibold text-gray-900">{numberLabel(point.totalActivity)}</td>
            </tr>
          ))}
          {!points.length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                {loading ? 'Chargement…' : 'Aucune donnée.'}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
    </div>
  )
}
