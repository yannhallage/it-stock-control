import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import {
  RiAlarmWarningLine,
  RiInboxArchiveLine,
  RiRefreshLine,
  RiStackLine,
  RiToolsLine,
  RiUserSharedLine,
} from '@remixicon/react'
import { get } from '@core/http/http'
import { ENDPOINTS } from '@core/http/endpoints'
import type { DashboardApiResponse } from '@core/models'
import { Card, PageTitle, Table } from '@shared/ui'

/** Vert principal de l'app (équivalent --color-primary) pour le rendu canvas ECharts */
const CHART_BAR_COLOR = '#16a34a'

const PIE_COLORS = ['#16a34a', '#2563eb', '#ea580c', '#6b7280']

/** Carte indicateur type dashboard (icône, titre caps, valeur, badge optionnel, sous-texte) */
function StatCard({
  title,
  value,
  footer,
  iconBoxClass,
  iconClass,
  icon,
  badge,
  to,
}: {
  title: string
  value: number | string
  footer: string
  iconBoxClass: string
  iconClass: string
  icon: ReactNode
  badge?: { text: string; variant: 'up' | 'down' | 'neutral' } | null
  to?: string
}) {
  const display =
    typeof value === 'number' ? value.toLocaleString('fr-FR') : String(value)

  const badgeClass =
    badge?.variant === 'up'
      ? 'bg-emerald-50 text-emerald-700'
      : badge?.variant === 'down'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-slate-100 text-slate-600'

  const content = (
    <div
      className={`flex min-w-0 gap-4 border border-gray-100 bg-white p-5 shadow-sm ${
        to ? 'transition hover:border-[var(--color-primary)] hover:shadow-md' : ''
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}
      >
        <span className={iconClass}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            {display}
          </span>
          {badge ? (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
            >
              {badge.variant === 'up' || badge.variant === 'down' ? (
                <span className="text-[10px] leading-none" aria-hidden>
                  {badge.variant === 'up' ? '▲' : '▼'}
                </span>
              ) : null}
              {badge.text}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-sm text-gray-500">{footer}</p>
      </div>
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block min-w-0 no-underline">
        {content}
      </Link>
    )
  }

  return content
}

function shareOfTotalPct(part: number, total: number): number | null {
  if (total <= 0 || !Number.isFinite(part) || !Number.isFinite(total)) return null
  return Math.round((part / total) * 1000) / 10
}

function shareBadge(
  part: number,
  total: number,
): { text: string; variant: 'neutral' } | null {
  const pct = shareOfTotalPct(part, total)
  if (pct == null) return null
  return {
    text: `${pct.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % du parc`,
    variant: 'neutral',
  }
}

/** Graphique à barres ECharts responsive (barres verticales) */
function BarChartStatus({
  statusEntries,
  loading,
}: {
  statusEntries: [string, number][]
  loading: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !statusEntries.length) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current)
    }
    const chart = chartRef.current

    const labels = statusEntries.map(([s]) => s.replace(/_/g, ' '))
    const values = statusEntries.map(([, n]) => n)

    const option: EChartsOption = {
      animation: true,
      animationDuration: 1500,
      animationEasing: 'elasticOut',
      animationDelay: (idx: number) => idx * 120,
      grid: { left: 48, right: 24, top: 16, bottom: 48, containLabel: false },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { rotate: labels.some((l) => l.length > 8) ? 25 : 0 },
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
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle: {
            color: CHART_BAR_COLOR,
          },
          barMaxWidth: 48,
          animationDelay: (idx: number) => idx * 120,
          animationDuration: (idx: number) => 1000 + idx * 80,
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(22, 163, 74, 0.4)' },
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : null
          if (p && 'name' in p && 'value' in p)
            return `${p.name}<br/><strong>${p.value}</strong>`
          return ''
        },
      },
    }
    chart.setOption(option)

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(containerRef.current)
    return () => {
      ro.disconnect()
    }
  }, [statusEntries])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  if (loading || !statusEntries.length) {
    return (
      <div className="flex h-[260px] items-center justify-center text-gray-500">
        {loading ? 'Chargement…' : 'Aucune donnée.'}
      </div>
    )
  }

  return <div ref={containerRef} className="h-[260px] w-full min-w-0" />
}

/** Graphique à barres horizontales ECharts (Top directions) */
function BarChartTopDepartments({
  top,
  loading,
}: {
  top: Array<{ department: string; count: number }>
  loading: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !top.length) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current)
    }
    const chart = chartRef.current

    const labels = top.map((t) => t.department)
    const values = top.map((t) => t.count)

    const option: EChartsOption = {
      animation: true,
      animationDuration: 1500,
      animationEasing: 'elasticOut',
      animationDelay: (idx: number) => idx * 120,
      grid: { left: 120, right: 48, top: 16, bottom: 24, containLabel: false },
      xAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#e5e7eb' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { width: 100, overflow: 'truncate' },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle: {
            color: CHART_BAR_COLOR,
          },
          barMaxWidth: 24,
          animationDelay: (idx: number) => idx * 120,
          animationDuration: (idx: number) => 1000 + idx * 80,
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(22, 163, 74, 0.4)' },
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : null
          if (p && 'name' in p && 'value' in p)
            return `${p.name}<br/><strong>${p.value}</strong> pannes`
          return ''
        },
      },
    }
    chart.setOption(option)

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [top])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  if (loading || !top.length) {
    return (
      <div className="flex h-[260px] items-center justify-center text-gray-500">
        {loading ? 'Chargement…' : 'Aucune donnée.'}
      </div>
    )
  }

  return <div ref={containerRef} className="h-[260px] w-full min-w-0" />
}

const MATERIEL_TYPE_CARD_STYLES = [
  { iconBoxClass: 'bg-slate-100', iconClass: 'text-slate-600' },
  { iconBoxClass: 'bg-sky-100', iconClass: 'text-sky-600' },
  { iconBoxClass: 'bg-amber-100', iconClass: 'text-amber-700' },
  { iconBoxClass: 'bg-emerald-50', iconClass: 'text-emerald-700' },
] as const

/** Résultats matériels par type — cartes (même esprit que la bande Résultats) */
function MaterielsParTypeCards({
  materielsParType,
  loading,
}: {
  materielsParType: Array<{ type: string; count: number }>
  loading: boolean
}) {
  const total = useMemo(
    () => materielsParType.reduce((s, m) => s + m.count, 0),
    [materielsParType],
  )

  if (loading || !materielsParType.length) {
    return (
      <div className="flex min-h-[120px] items-center justify-center py-8 text-gray-500">
        {loading ? 'Chargement…' : 'Aucune donnée.'}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {materielsParType.map((m, idx) => {
        const style = MATERIEL_TYPE_CARD_STYLES[idx % MATERIEL_TYPE_CARD_STYLES.length]
        return (
          <StatCard
            key={m.type}
            title={m.type.replace(/_/g, ' ')}
            value={m.count}
            footer="Matériels de ce type"
            iconBoxClass={style.iconBoxClass}
            iconClass={`${style.iconClass} [&>svg]:h-6 [&>svg]:w-6`}
            icon={<RiStackLine />}
            badge={shareBadge(m.count, total)}
          />
        )
      })}
    </div>
  )
}
function PieChartSimpleData({
  simple,
  loading,
}: {
  simple: DashboardApiResponse['simple_data'] | null | undefined
  loading: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const pieData = useMemo(() => {
    if (!simple) return []
    const { enStock, affectes, reparationsEnCours, totalMateriels } = simple
    const reste = totalMateriels - enStock - affectes - reparationsEnCours
    const items: Array<{ name: string; value: number }> = [
      { name: 'En stock', value: enStock },
      { name: 'Affectés', value: affectes },
      { name: 'Réparations en cours', value: reparationsEnCours },
      { name: 'Reste', value: reste >= 0 ? reste : 0 },
    ]
    return items
  }, [simple])

  useEffect(() => {
    if (!containerRef.current) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current)
    }
    const chart = chartRef.current

    if (!pieData.length) {
      chart.setOption({})
      return
    }

    const totalMateriels = simple?.totalMateriels ?? pieData.reduce((s, d) => s + d.value, 0)
    const allZero = pieData.every((d) => d.value === 0)

    if (allZero) {
      chart.setOption({
        graphic: [
          {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: `Total matériels\n${totalMateriels}`,
              fontSize: 16,
              fontWeight: 'bold',
              fill: '#374151',
            },
          },
        ],
      })
      return
    }

    const option: EChartsOption = {
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: <strong>{c}</strong> ({d}%)',
      },
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: {
            text: `Total matériels\n${totalMateriels}`,
            fontSize: 14,
            fontWeight: 'bold',
            fill: '#374151',
          },
          z: 10,
        },
      ],
      legend: {
        orient: 'vertical',
        right: 16,
        top: 'center',
        textStyle: { fontSize: 12 },
      },
      color: PIE_COLORS,
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: true,
          minAngle: 3,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{c}',
            fontSize: 11,
          },
          emphasis: {
            label: { show: true, fontSize: 12 },
            itemStyle: {
              shadowBlur: 12,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0,0,0,0.2)',
            },
          },
          data: pieData,
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDuration: (idx: number) => 800 + idx * 100,
          animationDelay: (idx: number) => idx * 150,
        },
      ],
    }
    chart.setOption(option)

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [pieData, simple])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  if (loading || !simple) {
    return (
      <div className="flex h-[260px] items-center justify-center text-gray-500">
        {loading ? 'Chargement…' : 'Aucune donnée.'}
      </div>
    )
  }

  return <div ref={containerRef} className="h-[260px] w-full min-w-0" />
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    get<DashboardApiResponse>(ENDPOINTS.dashboard)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const simple = data?.simple_data
  const top = useMemo(
    () => (data?.top_directions_pannes ?? []).map((d) => ({ department: d.direction, count: d.count })),
    [data],
  )
  const statusEntries = useMemo<[string, number][]>(
    () => (data?.repartition_par_etat ?? []).map((r) => [r.libelle, r.count]),
    [data],
  )
  const synthese = data?.synthese_par_etat ?? []
  const materielsParType = data?.materiels_par_type ?? []

  return (
    <div className="space-y-6">
      {/* Bande titre + cartes indicateurs */}
      <div className="space-y-4">
        <div>
          <PageTitle>Pilotage Direction</PageTitle>
          <p className="mt-1 text-sm text-gray-500">
            Indicateurs décisionnels — cliquez pour ouvrir l&apos;inventaire filtré
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total machines"
            value={simple?.totalMateriels ?? '—'}
            footer="Parc informatique"
            iconBoxClass="bg-slate-100"
            iconClass="text-slate-600 [&>svg]:h-6 [&>svg]:w-6"
            icon={<RiStackLine />}
            to="/inventaire"
          />
          <StatCard
            title="En stock"
            value={simple?.enStock ?? '—'}
            footer="Disponibles actuellement"
            iconBoxClass="bg-sky-100"
            iconClass="text-sky-600 [&>svg]:h-6 [&>svg]:w-6"
            icon={<RiInboxArchiveLine />}
            badge={
              simple ? shareBadge(simple.enStock, simple.totalMateriels) : null
            }
            to="/inventaire?status=EN_STOCK_NON_AFFECTE"
          />
          <StatCard
            title="Affectés"
            value={simple?.affectes ?? '—'}
            footer="Matériels assignés"
            iconBoxClass="bg-amber-100"
            iconClass="text-amber-700 [&>svg]:h-6 [&>svg]:w-6"
            icon={<RiUserSharedLine />}
            badge={
              simple ? shareBadge(simple.affectes, simple.totalMateriels) : null
            }
            to="/inventaire?status=AFFECTE"
          />
          <StatCard
            title="En réparation"
            value={simple?.reparationsEnCours ?? '—'}
            footer="En cours de traitement"
            iconBoxClass="bg-orange-100"
            iconClass="text-orange-700 [&>svg]:h-6 [&>svg]:w-6"
            icon={<RiToolsLine />}
            badge={
              simple
                ? shareBadge(simple.reparationsEnCours, simple.totalMateriels)
                : null
            }
            to="/inventaire?status=EN_REPARATION"
          />
          <StatCard
            title="En panne"
            value={simple?.enPanne ?? '—'}
            footer="Incidents ouverts / panne"
            iconBoxClass="bg-rose-100"
            iconClass="text-rose-700 [&>svg]:h-6 [&>svg]:w-6"
            icon={<RiAlarmWarningLine />}
            badge={
              simple ? shareBadge(simple.enPanne ?? 0, simple.totalMateriels) : null
            }
            to="/inventaire?status=EN_PANNE"
          />
          <StatCard
            title="Garanties expirées"
            value={simple?.garantiesExpirees ?? '—'}
            footer="Hors garantie"
            iconBoxClass="bg-violet-100"
            iconClass="text-violet-700 [&>svg]:h-6 [&>svg]:w-6"
            icon={<RiAlarmWarningLine />}
            to="/inventaire?renew=1"
          />
          <StatCard
            title="À renouveler"
            value={simple?.aRenouveler ?? '—'}
            footer="Garantie expirée ou âge ≥ 4 ans"
            iconBoxClass="bg-emerald-100"
            iconClass="text-emerald-700 [&>svg]:h-6 [&>svg]:w-6"
            icon={<RiRefreshLine />}
            to="/inventaire?renew=1"
          />
        </div>
      </div>

      {/* Pie chart — même infos que les cartes */}
      <div className="min-w-0 chart-card-enter" style={{ animationDelay: '0.05s' }}>
        <Card title="Répartition des matériels">
          <PieChartSimpleData simple={simple} loading={loading && !data} />
        </Card>
      </div>

      {error ? (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {/* Bande graphiques — grille adaptable : 1 col mobile, 2 cols desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="chart-card-enter" style={{ animationDelay: '0.15s' }}>
          <Card title="Répartition par état">
            <BarChartStatus statusEntries={statusEntries} loading={loading && !data} />
          </Card>
        </div>
        <div className="chart-card-enter" style={{ animationDelay: '0.25s' }}>
          <Card title="Top directions — pannes">
            <BarChartTopDepartments top={top} loading={loading && !data} />
          </Card>
        </div>
        <div className="lg:col-span-2 chart-card-enter" style={{ animationDelay: '0.35s' }}>
          <Card title="Matériels par type">
            <MaterielsParTypeCards materielsParType={materielsParType} loading={loading && !data} />
          </Card>
        </div>
      </div>

      {/* Bande tableau — pleine largeur */}
      <div className="chart-card-enter" style={{ animationDelay: '0.45s' }}>
        <Card title="Synthèse par état">
        <Table columns={['État', 'Effectif']}>
          {synthese.map((row) => (
            <tr key={row.etat} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{row.libelle}</td>
              <td className="px-4 py-3 text-gray-600">{row.count}</td>
            </tr>
          ))}
          {!synthese.length ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={2}>
                {data ? 'Aucune donnée.' : 'Chargement…'}
              </td>
            </tr>
          ) : null}
        </Table>
      </Card>
      </div>
    </div>
  )
}
