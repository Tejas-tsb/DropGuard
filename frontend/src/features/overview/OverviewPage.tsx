import { useMemo } from 'react'
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Icon } from '../../components/Icon'
import { DataFootnote, ErrorState, LoadingState, Panel, PanelHeading, StatCard } from '../../components/States'
import { PageIntro } from '../../components/PageIntro'
import { useApiQuery } from '../../hooks/useApiQuery'
import { api } from '../../services/api'
import { formatNumber, humanize } from '../../lib/format'
import type { RiskClass } from '../../types/api'

const riskColors: Record<RiskClass, string> = { 0: '#627D82', 1: '#9CE6C8' }

export function OverviewPage() {
  const overview = useApiQuery(api.overview)
  const grades = useApiQuery(api.grades)
  const distribution = useApiQuery(api.distribution)
  const factors = useApiQuery(api.factors)
  const states = [overview, grades, distribution, factors]
  const failed = states.find((state) => state.error)
  const reload = () => states.forEach((state) => state.reload())

  const gradeFrequency = useMemo(() => {
    if (!distribution.data) return []
    const maps = (['G1', 'G2', 'G3'] as const).map((grade) => {
      const entries = distribution.data?.numeric[grade] ?? []
      return new Map(entries.flatMap((entry) => typeof entry.value === 'number' ? [[entry.value, entry.count] as const] : []))
    })
    const values = [...new Set(maps.flatMap((map) => [...map.keys()]))].sort((a, b) => a - b)
    return values.map((value) => ({
      grade: value,
      G1: maps[0].get(value) ?? 0,
      G2: maps[1].get(value) ?? 0,
      G3: maps[2].get(value) ?? 0,
    }))
  }, [distribution.data])

  if (failed?.error) return <ErrorState message={failed.error} onRetry={reload} />
  if (states.some((state) => state.loading || !state.data)) return <LoadingState label="Loading supplied dataset analytics…" />

  const overviewData = overview.data!
  const gradeData = grades.data!
  const factorsData = factors.data!
  const atRisk = overviewData.academic_risk_distribution.find((item) => item.class === 1)
  const riskChart = overviewData.academic_risk_distribution.map((item) => ({
    label: item.class === 1 ? 'Academic-risk proxy' : 'No elevated risk indicated',
    count: item.count,
    percent: item.percentage,
    color: riskColors[item.class],
  }))
  const studyTimeGroups = factorsData.factors.studytime ?? []
  const maxStudyTimeGroup = studyTimeGroups.reduce((largest, current) =>
    current.student_count > largest.student_count ? current : largest,
    { value: null, student_count: 0, academic_risk_count: 0, academic_risk_rate: 0 },
  )

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Dataset lens"
        title="A clear view of academic performance"
        description="Observed records and grade summaries from the supplied dataset. The risk label is an academic-risk proxy, not a dropout outcome."
        action={<span className="source-chip"><span className="status-dot" /> Live dataset · {overviewData.dataset}</span>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students in dataset" value={formatNumber(overviewData.row_count, 0)} detail="Rows in supplied student performance data" icon={<Icon name="users" className="h-5 w-5" />} />
        <StatCard label="Academic-risk proxy" value={formatNumber(atRisk?.count ?? 0, 0)} detail={`${formatNumber(atRisk?.percentage ?? 0)}% of supplied records`} icon={<Icon name="shield" className="h-5 w-5" />} accent />
        <StatCard label="Average G2" value={formatNumber(gradeData.grades.G2.mean)} detail="Second grading period · descriptive only" icon={<Icon name="trend" className="h-5 w-5" />} />
        <StatCard label="Recorded fields" value={formatNumber(overviewData.input_feature_count, 0)} detail={`${formatNumber(overviewData.missing_cell_count, 0)} missing cells in source`} icon={<Icon name="check" className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.5fr]">
        <Panel className="p-5 sm:p-6">
          <PanelHeading eyebrow="Target distribution" title="Academic-risk proxy" description="Observed labels in the supplied dataset. Class 1 means G3 was below 10 in the source records." />
          {riskChart.length ? (
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_1fr] xl:grid-cols-1 2xl:grid-cols-[1fr_1fr]">
              <div className="h-[220px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskChart} dataKey="count" nameKey="label" innerRadius={59} outerRadius={88} paddingAngle={3} stroke="none">
                      {riskChart.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#132B30', border: '1px solid #294247', borderRadius: 10 }} itemStyle={{ color: '#E8F1EF' }} formatter={(value) => [formatNumber(Number(value), 0), 'Students']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {riskChart.map((item) => (
                  <div className="flex items-start gap-3" key={item.label}>
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm text-slate-200">{item.label}</p>
                        <p className="text-sm font-semibold text-white">{formatNumber(item.count, 0)}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted">{formatNumber(item.percent)}% of records</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="py-16 text-center text-sm text-muted">No risk distribution is available.</p>}
          <DataFootnote>{overviewData.target_definition}. This is not an observed dropout label.</DataFootnote>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <PanelHeading eyebrow="Grade frequencies" title="How recorded grades are distributed" description="Counts for each recorded grade value across all 649 source rows." />
          {gradeFrequency.length ? (
            <div className="h-[260px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gradeFrequency} margin={{ top: 10, right: 12, left: -18, bottom: 2 }}>
                  <CartesianGrid stroke="#263E43" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="grade" tick={{ fill: '#8FA7AA', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#8FA7AA', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#132B30', border: '1px solid #294247', borderRadius: 10 }} labelStyle={{ color: '#E8F1EF' }} />
                  <Legend wrapperStyle={{ color: '#A9BEC0', fontSize: 12 }} />
                  <Line dataKey="G1" name="G1 · period 1" stroke="#94A3B8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line dataKey="G2" name="G2 · period 2" stroke="#5FC5A0" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <Line dataKey="G3" name="G3 · final grade" stroke="#D5B879" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-16 text-center text-sm text-muted">No grade frequencies are available.</p>}
          <DataFootnote>G3 appears only in these descriptive dataset summaries. It is excluded from prediction inputs.</DataFootnote>
        </Panel>
      </div>

      <Panel className="p-5 sm:p-6">
        <PanelHeading eyebrow="Academic snapshot" title="Grade averages and study-time groups" description="Summary statistics from the API, shown without causal interpretation." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(['G1', 'G2', 'G3'] as const).map((grade, index) => (
            <div className="rounded-lg border border-line bg-panel/55 p-4" key={grade}>
              <p className="text-xs text-muted">{['First period average', 'Second period average', 'Final grade average'][index]}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(gradeData.grades[grade].mean, 2)}</p>
              <p className="mt-1 text-xs text-muted">Median {formatNumber(gradeData.grades[grade].median, 0)} · range {gradeData.grades[grade].minimum}–{gradeData.grades[grade].maximum}</p>
            </div>
          ))}
          <div className="rounded-lg border border-line bg-panel/55 p-4">
            <p className="text-xs text-muted">Most represented study-time value</p>
            <p className="mt-2 text-2xl font-semibold text-white">{humanize(maxStudyTimeGroup.value)}</p>
            <p className="mt-1 text-xs text-muted">{formatNumber(maxStudyTimeGroup.student_count, 0)} records · source scale 1–4</p>
          </div>
        </div>
      </Panel>
    </div>
  )
}
