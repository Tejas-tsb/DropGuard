import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Icon } from '../../components/Icon'
import { PageIntro } from '../../components/PageIntro'
import { DataFootnote, EmptyState, ErrorState, LoadingState, Panel, PanelHeading, StatCard } from '../../components/States'
import { formatNumber, percent } from '../../lib/format'
import { useApiQuery } from '../../hooks/useApiQuery'
import { api } from '../../services/api'
import type { ConfusionMatrixModel, ModelComparisonItem, RocModel } from '../../types/api'

const metricOptions = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1_score', label: 'F1-score' },
  { key: 'roc_auc', label: 'ROC-AUC' },
] as const

type MetricKey = (typeof metricOptions)[number]['key']
const randomForestColor = '#9CE6C8'

function ModelSelect({
  value,
  models,
  onChange,
}: {
  value: string
  models: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="min-w-[170px]">
      <span className="sr-only">Select model</span>
      <select className="field-control" onChange={(event) => onChange(event.currentTarget.value)} value={value}>
        {models.map((model) => <option key={model} value={model}>{model}</option>)}
      </select>
    </label>
  )
}

function ConfusionView({ model }: { model: ConfusionMatrixModel }) {
  const matrix = model.matrix
  const cells = [
    { row: 'Actual 0', column: 'Predicted 0', value: matrix[0][0], description: 'True negative' },
    { row: 'Actual 0', column: 'Predicted 1', value: matrix[0][1], description: 'False positive' },
    { row: 'Actual 1', column: 'Predicted 0', value: matrix[1][0], description: 'False negative' },
    { row: 'Actual 1', column: 'Predicted 1', value: matrix[1][1], description: 'True positive' },
  ]

  return (
    <>
      <div className="mb-3 grid grid-cols-[84px_1fr_1fr] gap-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted sm:grid-cols-[110px_1fr_1fr]">
        <span />
        <span className="text-center">Predicted 0</span>
        <span className="text-center">Predicted 1</span>
      </div>
      <div className="grid grid-cols-[84px_1fr_1fr] gap-2 sm:grid-cols-[110px_1fr_1fr]">
        {(['Actual 0', 'Actual 1'] as const).map((row, rowIndex) => (
          <div className="contents" key={row}>
            <div className="flex items-center text-xs font-medium text-slate-300">{row}</div>
            {[0, 1].map((columnIndex) => {
              const cell = cells[rowIndex * 2 + columnIndex]
              return (
                <div className={`rounded-lg border p-3 text-center sm:p-4 ${columnIndex === rowIndex ? 'border-mint/25 bg-mint/[0.06]' : 'border-line bg-panel/45'}`} key={columnIndex}>
                  <p className="text-[10px] text-muted">{cell.description}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{formatNumber(cell.value, 0)}</p>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted">{model.sample_count} held-out records · matrix rows are actual classes.</p>
      <div className="mt-5 overflow-x-auto">
        <table className="data-table min-w-[440px]">
          <thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1-score</th><th>Support</th></tr></thead>
          <tbody>
            {model.per_class_metrics.map((metric) => (
              <tr key={metric.class}>
                <td>{metric.class === 1 ? 'Academic-risk proxy · 1' : 'Class 0'}</td>
                <td>{percent(metric.precision)}</td>
                <td>{percent(metric.recall)}</td>
                <td>{percent(metric.f1_score)}</td>
                <td>{formatNumber(metric.support, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function buildRocPoints(model: RocModel) {
  return model.fpr.map((fpr, index) => ({
    fpr,
    tpr: model.tpr[index],
    threshold: model.thresholds[index],
  }))
}

export function ModelPerformancePage() {
  const metrics = useApiQuery(api.metrics)
  const comparison = useApiQuery(api.comparison)
  const confusion = useApiQuery(api.confusionMatrix)
  const roc = useApiQuery(api.rocData)
  const [metric, setMetric] = useState<MetricKey>('accuracy')
  const [selectedModel, setSelectedModel] = useState('Random Forest')
  const states = [metrics, comparison, confusion, roc]
  const failed = states.find((state) => state.error)
  const reload = () => states.forEach((state) => state.reload())

  if (failed?.error) return <ErrorState message={failed.error} onRetry={reload} />
  if (states.some((state) => state.loading || !state.data)) return <LoadingState label="Loading exported evaluation results…" />

  const metricData = comparison.data!.models
  const modelNames = metricData.map((item) => item.model)
  const selectedComparison = metricData.find((item) => item.model === selectedModel) ?? metricData[0]
  const confusionModels = confusion.data?.available ? confusion.data.data?.models ?? [] : []
  const rocModels = roc.data?.available ? roc.data.data?.models ?? [] : []
  const selectedConfusion = confusionModels.find((item) => item.model === selectedModel)
  const selectedRoc = rocModels.find((item) => item.model === selectedModel)
  const selectedMetricLabel = metricOptions.find((option) => option.key === metric)?.label ?? 'Accuracy'

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Held-out evaluation · 130 records"
        title="Compare model performance"
        description="Metrics, confusion matrices and ROC curves are connected to the exported evaluation artifacts. Random Forest is the fitted model used by DropGuard predictions."
        action={<span className="source-chip"><span className="h-2 w-2 rounded-full bg-mint" /> Selected model · Random Forest</span>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Random Forest accuracy" value={percent(metrics.data!.test.accuracy)} detail="Held-out test result" icon={<Icon name="check" className="h-5 w-5" />} accent />
        <StatCard label="Precision · class 1" value={percent(metrics.data!.test.precision)} detail="Random Forest · academic-risk proxy" icon={<Icon name="trend" className="h-5 w-5" />} />
        <StatCard label="Recall · class 1" value={percent(metrics.data!.test.recall)} detail="Random Forest · academic-risk proxy" icon={<Icon name="trend" className="h-5 w-5" />} />
        <StatCard label="ROC-AUC" value={percent(metrics.data!.test.roc_auc)} detail="Random Forest · probability ranking" icon={<Icon name="analytics" className="h-5 w-5" />} />
      </div>

      <Panel className="p-5 sm:p-6">
        <PanelHeading
          eyebrow="Five-model comparison"
          title={`${selectedMetricLabel} on the held-out test set`}
          description="Select a metric to compare the original exported results for all five trained classifiers."
          action={(
            <div aria-label="Select metric" className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-ink/60 p-1" role="group">
              {metricOptions.map((option) => (
                <button
                  aria-pressed={metric === option.key}
                  className={`metric-tab ${metric === option.key ? 'metric-tab-active' : ''}`}
                  key={option.key}
                  onClick={() => setMetric(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        />
        <div className="h-[310px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metricData} margin={{ top: 12, right: 8, left: -10, bottom: 4 }}>
              <CartesianGrid stroke="#263E43" strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="model" interval={0} tick={{ fill: '#A9BEC0', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tick={{ fill: '#8FA7AA', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [percent(Number(value)), selectedMetricLabel]} contentStyle={{ background: '#132B30', border: '1px solid #294247', borderRadius: 10 }} />
              <Bar dataKey={`test.${metric}`} name={selectedMetricLabel} radius={[5, 5, 0, 0]} maxBarSize={58}>
                {metricData.map((item) => <Cell key={item.model} fill={item.model === 'Random Forest' ? randomForestColor : '#547177'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <DataFootnote>Random Forest is highlighted because it is the model loaded by the prediction endpoint. Values come from the supplied test comparison CSV and are cross-checked against the held-out predictions.</DataFootnote>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <PanelHeading eyebrow="Model results" title="Exported test and cross-validation scores" description="All displayed figures are read from the existing evaluation results." />
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead><tr><th>Model</th><th>Test accuracy</th><th>Precision</th><th>Recall</th><th>F1-score</th><th>ROC-AUC</th><th>Cross-val AUC</th></tr></thead>
            <tbody>
              {metricData.map((item: ModelComparisonItem) => (
                <tr className={item.model === 'Random Forest' ? 'data-row-selected' : ''} key={item.model}>
                  <td><span className="flex items-center gap-2">{item.model}{item.model === 'Random Forest' && <span className="mini-chip">Selected</span>}</span></td>
                  <td>{percent(item.test.accuracy)}</td>
                  <td>{percent(item.test.precision)}</td>
                  <td>{percent(item.test.recall)}</td>
                  <td>{percent(item.test.f1_score)}</td>
                  <td>{percent(item.test.roc_auc)}</td>
                  <td>{percent(item.cross_validation.roc_auc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 2xl:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <PanelHeading
            eyebrow="Predicted classes"
            title="Confusion matrix"
            description="Matrices use each classifier’s exported prediction column, not its probabilities."
            action={<ModelSelect models={modelNames} onChange={setSelectedModel} value={selectedModel} />}
          />
          {confusionModels.length === 0 ? (
            <EmptyState title="Confusion matrix unavailable" detail="The backend did not return held-out prediction counts." />
          ) : selectedConfusion ? <ConfusionView model={selectedConfusion} /> : <EmptyState title="Select a model" detail="No confusion matrix is available for the selected model." />}
          <DataFootnote>Class 1 is the academic-risk proxy (`G3 &lt; 10`). This is not actual dropout prediction.</DataFootnote>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <PanelHeading
            eyebrow="Probability ranking"
            title="ROC curve"
            description={selectedRoc ? `ROC-AUC ${percent(selectedRoc.auc)} for ${selectedRoc.model}.` : 'Curve coordinates use the model’s class-1 probability column.'}
            action={<ModelSelect models={modelNames} onChange={setSelectedModel} value={selectedModel} />}
          />
          {rocModels.length === 0 ? (
            <EmptyState title="ROC data unavailable" detail="The backend did not return held-out probability scores." />
          ) : selectedRoc ? (
            <>
              <div className="h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={buildRocPoints(selectedRoc)} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid stroke="#263E43" strokeDasharray="3 5" />
                    <XAxis dataKey="fpr" type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tick={{ fill: '#8FA7AA', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="tpr" type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tick={{ fill: '#8FA7AA', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#132B30', border: '1px solid #294247', borderRadius: 10 }}
                      formatter={(value, name) => [percent(Number(value)), name === 'tpr' ? 'True positive rate' : 'False positive rate']}
                      labelFormatter={(_label, payload) => payload?.[0]?.payload ? `Threshold ${payload[0].payload.threshold ?? '∞'}` : ''}
                    />
                    <Line dataKey="tpr" name="True positive rate" stroke="#79D9B2" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} type="linear" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted">Axes show false-positive rate (x) and true-positive rate (y). {selectedRoc.sample_count} held-out records.</p>
            </>
          ) : <EmptyState title="Select a model" detail="No ROC curve is available for the selected model." />}
        </Panel>
      </div>

      <Panel className="p-5 sm:p-6">
        <PanelHeading eyebrow="Selected evaluation" title={selectedComparison?.model ?? 'Model'} description="Detailed class-level evaluation for the selected classifier." action={<ModelSelect models={modelNames} onChange={setSelectedModel} value={selectedModel} />} />
        {selectedComparison ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {selectedComparison.held_out_predictions.per_class_metrics.map((item) => (
              <div className="rounded-lg border border-line bg-panel/55 p-4" key={item.class}>
                <p className="text-xs text-muted">{item.class === 1 ? 'Academic-risk proxy · class 1' : 'Class 0'}</p>
                <p className="mt-2 text-lg font-semibold text-white">F1 {percent(item.f1_score)}</p>
                <p className="mt-1 text-xs text-muted">Precision {percent(item.precision)} · Recall {percent(item.recall)}</p>
                <p className="mt-1 text-xs text-muted">Support {formatNumber(item.support, 0)} held-out records</p>
              </div>
            ))}
          </div>
        ) : <EmptyState title="No model results" detail="The comparison response did not include any models." />}
      </Panel>
    </div>
  )
}
