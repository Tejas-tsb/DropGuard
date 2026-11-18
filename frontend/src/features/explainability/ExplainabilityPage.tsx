import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Icon } from '../../components/Icon'
import { PageIntro } from '../../components/PageIntro'
import { DataFootnote, EmptyState, ErrorState, LoadingState, Panel, PanelHeading } from '../../components/States'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatNumber, humanize, percent } from '../../lib/format'
import { api } from '../../services/api'

const descriptions: Record<string, string> = {
  school: 'School attended in the source records.',
  sex: 'Sex value recorded in the source dataset.',
  age: 'Student age in years.',
  address: 'Urban or rural home-area category.',
  famsize: 'Family-size category.',
  Pstatus: 'Parents’ cohabitation-status category.',
  Medu: 'Mother’s education-level category.',
  Fedu: 'Father’s education-level category.',
  Mjob: 'Mother’s job category.',
  Fjob: 'Father’s job category.',
  reason: 'Reported reason for choosing the school.',
  guardian: 'Primary guardian category.',
  traveltime: 'Travel-time category to school.',
  studytime: 'Study-time category in the source data.',
  failures: 'Number of previous class failures recorded.',
  schoolsup: 'Extra educational support from the school.',
  famsup: 'Family educational support indicator.',
  paid: 'Paid extra-class indicator.',
  activities: 'Extracurricular-activity indicator.',
  nursery: 'Prior nursery attendance indicator.',
  higher: 'Interest in higher education indicator.',
  internet: 'Internet access at home indicator.',
  romantic: 'Relationship indicator recorded in the source data.',
  famrel: 'Self-reported family-relationship rating.',
  freetime: 'Self-reported free-time rating.',
  goout: 'Self-reported going-out rating.',
  Dalc: 'Self-reported weekday alcohol-use rating.',
  Walc: 'Self-reported weekend alcohol-use rating.',
  health: 'Self-reported health rating in the source records.',
  absences: 'Number of school absences recorded.',
  G1: 'First-period grade; never used as a proxy target.',
  G2: 'Second-period grade used at prediction time.',
}

export function ExplainabilityPage() {
  const query = useApiQuery(api.featureImportance)
  if (query.error) return <ErrorState message={query.error} onRetry={query.reload} />
  if (query.loading || !query.data) return <LoadingState label="Loading fitted-model feature importance…" />

  const data = query.data
  const topFeatures = data.input_feature_importance.slice(0, 12)
  const highest = data.input_feature_importance[0]

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Fitted Random Forest"
        title="What the model used most"
        description="The chart aggregates transformed pipeline features back to the original 32 inputs where possible."
        action={<span className="source-chip"><Icon name="analytics" className="h-3.5 w-3.5" /> Impurity-based importance</span>}
      />

      {highest && (
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-mint/10 text-mint"><Icon name="spark" className="h-5 w-5" /></span>
              <div>
                <p className="eyebrow">Highest aggregated input importance</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{humanize(highest.feature)}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{descriptions[highest.feature] ?? 'Input feature supplied to the fitted model.'}</p>
              </div>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-mint">{percent(highest.importance, 2)}</p>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <Panel className="p-5 sm:p-6">
          <PanelHeading eyebrow="Ranked importance" title="Top input features" description="Values come directly from the model’s feature_importances_ after transformed features are mapped to original inputs." />
          {topFeatures.length ? (
            <div className="h-[480px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFeatures} layout="vertical" margin={{ top: 4, right: 28, left: 14, bottom: 4 }}>
                  <CartesianGrid stroke="#263E43" strokeDasharray="3 5" horizontal={false} />
                  <XAxis type="number" domain={[0, (maximum: number) => Math.max(maximum, 0.08)]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tick={{ fill: '#8FA7AA', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="feature" width={100} tickFormatter={(value) => humanize(String(value))} tick={{ fill: '#B8C8C9', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [percent(Number(value), 2), 'Importance']} contentStyle={{ background: '#132B30', border: '1px solid #294247', borderRadius: 10 }} />
                  <Bar dataKey="importance" fill="#74D3AC" radius={[0, 4, 4, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState title="No feature importances returned" detail="The model response did not include ranked input features." />}
        </Panel>

        <Panel className="p-5 sm:p-6">
          <PanelHeading eyebrow="Indicator guide" title="Top feature descriptions" description="Plain-language labels for the leading model inputs." />
          <div className="space-y-1">
            {topFeatures.slice(0, 8).map((item, index) => (
              <div className="flex gap-3 border-b border-line/70 py-3 last:border-b-0" key={item.feature}>
                <span className="mt-0.5 w-6 shrink-0 text-xs tabular-nums text-muted">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-slate-100">{humanize(item.feature)}</p>
                    <span className="text-xs tabular-nums text-mint">{percent(item.importance, 2)}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted">{descriptions[item.feature] ?? 'Input feature supplied to the fitted model.'}</p>
                </div>
              </div>
            ))}
          </div>
          <DataFootnote>{formatNumber(data.input_feature_importance.length, 0)} original inputs are returned by the backend. Transformed one-hot columns are available separately in the API response.</DataFootnote>
        </Panel>
      </div>

      <Panel className="border-mint/15 bg-mint/[0.025] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
          <div>
            <h2 className="text-sm font-semibold text-white">Association, not causation</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{data.interpretation} Importance scores describe how this fitted Random Forest used the supplied inputs. They do not establish why a student received a particular result, and they do not show that changing an input would change an outcome.</p>
            <p className="mt-3 text-xs leading-5 text-muted">The target is an academic-risk proxy defined as G3 below 10. It is not actual dropout prediction.</p>
          </div>
        </div>
      </Panel>
    </div>
  )
}
