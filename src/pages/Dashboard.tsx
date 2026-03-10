import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { get } from '../api/http'
import { ENDPOINTS } from '../api/endpoints'
import type { DashboardApiResponse } from '../types'
import { Card, PageTitle, Table } from '../components/Ui'

/** Vert principal de l'app (équivalent --color-primary) pour le rendu canvas ECharts */
const CHART_BAR_COLOR = '#16a34a'

const PIE_COLORS = ['#16a34a', '#2563eb', '#ea580c', '#6b7280']

function StatPill({
  label,
  value,
  active,
}: {
  label: string
  value: number | string
  active?: boolean
}) {
  return (
    <span
      className={
        active
          ? 'inline-flex items-center gap-2 bg-[var(--color-pill-active)] px-3 py-1.5 text-sm font-medium text-[var(--color-pill-active-text)]'
          : 'inline-flex items-center gap-2 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700'
      }
    >
      {active ? (
        <span className="h-2 w-2 bg-emerald-500" />
      ) : null}
      {label} {value}
    </span>
  )
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
      animationDuration: 1200,
      animationEasing: 'elasticOut',
      animationDelay: (idx: number) => idx * 100,
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
          animationDelay: (idx: number) => idx * 100,
          animationDuration: (idx: number) => 800 + idx * 50,
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
      animationDuration: 1200,
      animationEasing: 'elasticOut',
      animationDelay: (idx: number) => idx * 100,
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
          animationDelay: (idx: number) => idx * 100,
          animationDuration: (idx: number) => 800 + idx * 50,
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

/** Graphique en courbe (ligne) pour materiels_par_type */
function LineChartMaterielsParType({
  materielsParType,
  loading,
}: {
  materielsParType: Array<{ type: string; count: number }>
  loading: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const labels = materielsParType.map((m) => m.type)
  const values = materielsParType.map((m) => m.count)

  useEffect(() => {
    if (!containerRef.current || !labels.length) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current)
    }
    const chart = chartRef.current

    const option: EChartsOption = {
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      grid: { left: 48, right: 24, top: 24, bottom: 48, containLabel: false },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: true,
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
          type: 'line',
          data: values,
          smooth: true,
          symbol: 'circle',
          symbolSize: 10,
          lineStyle: { width: 2, color: CHART_BAR_COLOR },
          itemStyle: { color: CHART_BAR_COLOR, borderColor: '#fff', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 163, 74, 0.35)' },
                { offset: 1, color: 'rgba(22, 163, 74, 0.02)' },
              ],
            },
          },
          emphasis: {
            focus: 'series',
            itemStyle: { borderColor: CHART_BAR_COLOR, borderWidth: 2, shadowBlur: 8 },
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : null
          if (p && 'name' in p && 'value' in p)
            return `${(p as { name: string; value: number }).name}<br/><strong>${(p as { name: string; value: number }).value}</strong> matériel(s)`
          return ''
        },
      },
    }
    chart.setOption(option)

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [materielsParType])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  if (loading || !materielsParType.length) {
    return (
      <div className="flex h-[260px] items-center justify-center text-gray-500">
        {loading ? 'Chargement…' : 'Aucune donnée.'}
      </div>
    )
  }

  return <div ref={containerRef} className="h-[260px] w-full min-w-0" />
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
          animationDelay: (idx: number) => idx * 120,
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
    setLoading(true)
    setError(null)
    get<DashboardApiResponse>(ENDPOINTS.dashboard)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e))
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
      {/* Bande titre + indicateurs — adaptable */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle>Résultats</PageTitle>
        <div className="flex flex-wrap items-center gap-2">
          <StatPill
            label="Total matériels"
            value={simple?.totalMateriels ?? '—'}
            active
          />
          <StatPill label="En stock" value={simple?.enStock ?? '—'} />
          <StatPill label="Affectés" value={simple?.affectes ?? '—'} />
          <StatPill label="Réparations en cours" value={simple?.reparationsEnCours ?? '—'} />
        </div>
      </div>

      {/* Pie chart — même infos que les pills */}
      <div className="min-w-0">
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
        <Card title="Répartition par état">
          <BarChartStatus statusEntries={statusEntries} loading={loading && !data} />
        </Card>
        <Card title="Top directions — pannes">
          <BarChartTopDepartments top={top} loading={loading && !data} />
        </Card>
        <div className="lg:col-span-2">
          <Card title="Matériels par type">
            <LineChartMaterielsParType materielsParType={materielsParType} loading={loading && !data} />
          </Card>
        </div>
      </div>

      {/* Bande tableau — pleine largeur */}
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
  )
}
