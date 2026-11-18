import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageIntro } from '../../components/PageIntro'
import { DataFootnote, ErrorState, LoadingState, Panel, PanelHeading, StatCard } from '../../components/States'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatNumber, humanize, percent } from '../../lib/format'
import { api } from '../../services/api'
import { Icon } from '../../components/Icon'

const factorOptions = [
  { key: 'studytime', label: 'Study-time category' },
  { key: 'failures', label: 'Previous class failures' },
  { key: 'absences', label: 'Recorded absences' },
  { key: 'school', label: 'School' },
  { key: 'sex', label: 'Recorded sex' },
  { key: 'age', label: 'Age' },
  { key: 'address', label: 'Home address area' },
] as const

type SupportedFactor = (typeof factorOptions)[number]['key']

export function StudentAnalyticsPage() {
  const overview = useApiQuery(api.overview)
  const distribution = useApiQuery(api.distribution)
  const grades = useApiQuery(api.grades)
  const factors = useApiQuery(api.factors)
  const [selectedFactor, setSelectedFactor] = useState<SupportedFactor>('studytime')
  const states = [overview, distribution, grades, factors]
  const failed = states.find((state) => state.error)
  const reload = () => states.forEach((state) => state.reload())

  const gradeFrequency = useMemo(() => {
    if (!distribution.data) return []
    const series = (['G1', 'G2', 'G3'] as const).map((grade) => new Map(
      (distribution.data?.numeric[grade] ?? []).flatMap((item) =>
        typeof item.value === 'number' ? [[item.value, item.count] as const] : [],
      ),
    ))
    const marks = [...new Set(series.flatMap((map) => [...map.keys()]))].sort((a, b) => a - b)
    return marks.map((grade) => ({
      grade,
      G1: series[0].get(grade) ?? 0,
      G2: series[1].get(grade) ?? 0,
      G3: series[2].get(grade) ?? 0,
    }))
  }, [distribution.data])

  if (failed?.error) return <ErrorState message={failed.error} onRetry={reload} />
  if (states.some((state) => state.loading || !state.data)) return <LoadingState label="Loading student analytics…" />

  const overviewData = overview.data!
  const factorsData = factors.data!
  const gradeData = grades.data!
  const currentFactorGroups = factorsData.factors[selectedFactor] ?? []
  const sortedGroups = [...currentFactorGroups].sort((a, b) => b.student_count - a.student_count)
  const chartGroups = selectedFactor === 'absences' ? sortedGroups.slice(0, 12) : currentFactorGroups
  const riskCount = overviewData.academic_risk_distribution.find((item) => item.class === 1)?.count ?? 0
  const riskPercentage = overviewData.academic_risk_distribution.find((item) => item.class === 1)?.percentage ?? 0
  const gradeByRisk = gradeData.by_academic_risk.map((item) => ({
    group: item.academic_risk === 1 ? 'Academic-risk proxy' : 'No elevated risk indicated',
    G1: item.grade_means.G1,
    G2: item.grade_means.G2,
    G3: item.grade_means.G3,
  }))

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Observed dataset summaries"
        title="Explore student patterns"
        description="Compare observed distributions and unadjusted group rates. These summaries describe the supplied dataset and do not establish causes."
        action={<span className="source-chip"><Icon name="users" className="h-3.5 w-3.5" /> {formatNumber(overviewData.row_count, 0)} records</span>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Academic-risk proxy" value={`${formatNumber(riskPercentage)}%`} detail={`${formatNumber(riskCount, 0)} of ${formatNumber(overviewData.row_count, 0)} supplied records`} icon={<Icon name="shield" className="h-5 w-5" />} accent />
        <StatCard label="Mean G1" value={formatNumber(gradeData.grades.G1.mean)} detail="First grading-period mark" icon={<Icon name="trend" className="h-5 w-5" />} />
        <StatCard label="Mean G2" value={formatNumber(gradeData.grades.G2.mean)} detail="Second grading-period mark" icon={<Icon name="trend" className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <PanelHeading eyebrow="Grade frequencies" title="Recorded marks across grading periods" description="Counts by grade value, calculated from the source dataset." />
          {gradeFrequency.length ? (
            <div className="h-[290px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gradeFrequency} margin={{ top: 8, right: 10, left: -16, bottom: 2 }}>
                  <CartesianGrid stroke="#263E43" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="grade" tick={{ fill: '#8FA7AA', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#8FA7AA', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#132B30', border: '1px solid #294247', borderRadius: 10 }} labelStyle={{ color: '#E8F1EF' }} />
                  <Legend wrapperStyle={{ color: '#A9BEC0', fontSize: 12 }} />
                  <Line dataKey="G1" name="G1" stroke="#94A3B8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line dataKey="G2" name="G2" stroke="#5FC5A0" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <Line dataKey="G3" name="G3 · descriptive only" stroke="#D5B879" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-16 text-center text-sm text-muted">Grade distribution is unavailable.</p>}
          <DataFootnote>G3 appears in descriptive analytics only. The prediction API does not accept G3.</DataFootnote>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <PanelHeading eyebrow="Group comparison" title="Average grades by observed label" description="Means grouped by the dataset’s academic-risk proxy label." />
          {gradeByRisk.length ? (
            <div className="h-[290px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeByRisk} margin={{ top: 8, right: 8, left: -12, bottom: 2 }}>
                  <CartesianGrid stroke="#263E43" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="group" tick={{ fill: '#A8BABC', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 20]} tick={{ fill: '#8FA7AA', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#132B30', border: '1px solid #294247', borderRadius: 10 }} />
                  <Legend wrapperStyle={{ color: '#A9BEC0', fontSize: 12 }} />
                  <Bar dataKey="G1" fill="#94A3B8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="G2" fill="#5FC5A0" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="G3" fill="#D5B879" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-16 text-center text-sm text-muted">Grade group summary is unavailable.</p>}
          <DataFootnote>Descriptive grouping is not a causal or individual-level explanation.</DataFootnote>
        </Panel>
      </div>

      <Panel className="p-5 sm:p-6">
        <PanelHeading
          eyebrow="Group rate explorer"
          title="Observed academic-risk rates by factor"
          description="Choose a dimension present in the supplied factors response. Bars show each group’s observed label rate; counts are shown below."
          action={(
            <label className="min-w-[190px]">
              <span className="sr-only">Group students by</span>
              <select className="field-control" onChange={(event) => setSelectedFactor(event.currentTarget.value as SupportedFactor)} value={selectedFactor}>
                {factorOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
            </label>
          )}
        />
        {chartGroups.length ? (
          <>
            <div className="h-[320px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartGroups} margin={{ top: 8, right: 10, left: -10, bottom: 10 }}>
                  <CartesianGrid stroke="#263E43" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="value" tickFormatter={(value) => humanize(value)} interval={0} angle={chartGroups.length > 8 ? -35 : 0} textAnchor={chartGroups.length > 8 ? 'end' : 'middle'} height={chartGroups.length > 8 ? 65 : 32} tick={{ fill: '#9AB0B2', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tick={{ fill: '#8FA7AA', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#132B30', border: '1px solid #294247', borderRadius: 10 }}
                    formatter={(value, _name, item) => [
                      `${percent(Number(value))} · ${formatNumber(Number(item.payload.student_count), 0)} records`,
                      'Observed rate',
                    ]}
                    labelFormatter={(value) => `${factorOptions.find((option) => option.key === selectedFactor)?.label}: ${humanize(value as string | number | null)}`}
                  />
                  <Bar dataKey="academic_risk_rate" name="Observed rate" fill="#74D3AC" radius={[4, 4, 0, 0]} maxBarSize={55} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {chartGroups.map((group) => (
                <span className="rounded-md border border-line bg-panel/50 px-2.5 py-1.5 text-[11px] text-muted" key={String(group.value)}>
                  {humanize(group.value)} <span className="ml-1 text-slate-200">{formatNumber(group.student_count, 0)} records</span>
                </span>
              ))}
              {selectedFactor === 'absences' && currentFactorGroups.length > chartGroups.length && (
                <span className="self-center text-[11px] text-muted">Showing the 12 most represented recorded values.</span>
              )}
            </div>
          </>
        ) : <p className="py-16 text-center text-sm text-muted">No groups are available for this dimension.</p>}
        <DataFootnote>{factorsData.interpretation} A group rate is not an individual student prediction.</DataFootnote>
      </Panel>
    </div>
  )
}
