import { useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { DataFootnote, Panel, PanelHeading } from '../../components/States'
import { PageIntro } from '../../components/PageIntro'
import { ApiError, api } from '../../services/api'
import type { PredictionInput, PredictionResponse } from '../../types/api'
import { buildStudentGuidance, resultSummary } from '../counseling/guidance'
import { generateDemoProfile } from './demoProfile'
import { allPredictionFields, predictionFieldGroups, type PredictionField, type PredictionFieldName } from './fields'

type FormValues = Partial<Record<PredictionFieldName, string>>

function toPredictionInput(values: FormValues): PredictionInput {
  const payload: Record<string, string | number> = {}
  for (const field of allPredictionFields) {
    const value = values[field.name]
    if (value === undefined || value.trim() === '') {
      throw new Error(`Please complete ${field.label.toLowerCase()}.`)
    }
    // Several integer model features are rendered as selects for constrained
    // source categories (education, travel/study time and rating scales). Send
    // those as JSON numbers too; HTML select values are always strings.
    const integerChoice = field.choices?.length
      ? field.choices.every((choice) => /^\d+$/.test(choice.value))
      : false
    payload[field.name] = field.control === 'number' || integerChoice ? Number(value) : value
  }
  return payload as unknown as PredictionInput
}

function InputField({
  field,
  value,
  onChange,
}: {
  field: PredictionField
  value: string
  onChange: (name: PredictionFieldName, value: string) => void
}) {
  const id = `prediction-${field.name}`
  if (field.control === 'radio') {
    return (
      <fieldset className="min-w-0" aria-describedby={field.help ? `${id}-help` : undefined}>
        <legend className="field-label">{field.label}<span className="ml-1 text-mint">*</span></legend>
        <div className="mt-2 flex min-h-11 flex-wrap gap-2">
          {field.choices?.map((choice) => (
            <label
              className={`radio-choice ${value === choice.value ? 'radio-choice-selected' : ''}`}
              key={choice.value}
            >
              <input
                checked={value === choice.value}
                className="sr-only"
                name={field.name}
                onChange={() => onChange(field.name, choice.value)}
                required
                type="radio"
                value={choice.value}
              />
              {choice.label}
            </label>
          ))}
        </div>
        {field.help && <p className="field-help" id={`${id}-help`}>{field.help}</p>}
      </fieldset>
    )
  }

  return (
    <div className="min-w-0">
      <label className="field-label" htmlFor={id}>{field.label}<span className="ml-1 text-mint">*</span></label>
      {field.control === 'number' ? (
        <input
          autoComplete="off"
          className="field-control mt-2"
          id={id}
          max={field.max}
          min={field.min}
          name={field.name}
          onChange={(event) => onChange(field.name, event.currentTarget.value)}
          required
          step="1"
          type="number"
          value={value}
        />
      ) : (
        <select
          className="field-control mt-2"
          id={id}
          name={field.name}
          onChange={(event) => onChange(field.name, event.currentTarget.value)}
          required
          value={value}
        >
          <option disabled value="">Select a value</option>
          {field.choices?.map((choice) => (
            <option key={choice.value} value={choice.value}>{choice.label}</option>
          ))}
        </select>
      )}
      {field.help && <p className="field-help" id={`${id}-help`}>{field.help}</p>}
    </div>
  )
}

function PredictionResult({
  input,
  result,
  onOpenCounseling,
}: {
  input: PredictionInput
  result: PredictionResponse
  onOpenCounseling: () => void
}) {
  const isElevated = result.predicted_class === 1
  const probability = Math.max(0, Math.min(1, result.academic_risk_probability))
  const suggestions = buildStudentGuidance(input)

  return (
    <div className="space-y-4">
      <Panel className="overflow-hidden p-0">
        <div className={`h-1 ${isElevated ? 'bg-amber-300' : 'bg-mint'}`} />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${isElevated ? 'bg-amber-300/10 text-amber-200' : 'bg-mint/10 text-mint'}`}>
                <Icon name={isElevated ? 'info' : 'check'} className="h-5 w-5" />
              </span>
              <div>
                <p className="eyebrow">Model result</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{result.risk_category}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{resultSummary(result)}</p>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-panel/70 px-3 py-2 text-right">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">Predicted class</p>
              <p className="mt-1 text-lg font-semibold text-white">{result.predicted_class}</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-line bg-panel/50 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Probability of academic risk</p>
                <p className="mt-1 text-xs text-muted">Class 1 · {result.target_definition}</p>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-white">{(probability * 100).toFixed(1)}%</p>
            </div>
            <div
              aria-label={`Academic-risk probability ${(probability * 100).toFixed(1)} percent`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(probability * 100)}
              className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
              role="meter"
            >
              <div className={`h-full rounded-full ${isElevated ? 'bg-amber-300' : 'bg-mint'}`} style={{ width: `${probability * 100}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">The class comes from the fitted model’s default prediction rule. This probability is not a counseling threshold or a dropout likelihood.</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">Use this as one input to a supportive review, not as a decision about a student.</p>
            <button className="button-secondary" onClick={onOpenCounseling} type="button">
              Open counseling guidance <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <PanelHeading eyebrow="Conversation starters" title="Practical next steps" description="General educational suggestions based on the submitted academic indicators. They are not medical or psychological diagnoses." />
        <div className="grid gap-3 md:grid-cols-2">
          {suggestions.map((item, index) => (
            <div className="flex gap-3 rounded-lg border border-line bg-panel/50 p-4" key={item.title}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/[0.05] text-xs font-semibold text-mint">{index + 1}</span>
              <div>
                <h3 className="text-sm font-medium text-slate-100">{item.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

export function PredictionPage({
  onPrediction,
  onOpenCounseling,
}: {
  onPrediction: (input: PredictionInput, result: PredictionResponse) => void
  onOpenCounseling: () => void
}) {
  const [values, setValues] = useState<FormValues>({})
  const [result, setResult] = useState<PredictionResponse | null>(null)
  const [submittedInput, setSubmittedInput] = useState<PredictionInput | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [demoStatus, setDemoStatus] = useState<'generated' | 'modified' | null>(null)
  const [demoNotice, setDemoNotice] = useState<string | null>(null)

  const updateField = (name: PredictionFieldName, value: string) => {
    setValues((current) => ({ ...current, [name]: value }))
    setError(null)
    if (demoStatus) {
      setDemoStatus('modified')
      setDemoNotice('Demo profile modified. Review the values before predicting.')
    }
  }

  const generateDemo = () => {
    const profile = generateDemoProfile(values)
    setValues(profile)
    setResult(null)
    setSubmittedInput(null)
    setError(null)
    setDemoStatus('generated')
    setDemoNotice('New demo student profile generated.')
  }

  const reset = () => {
    setValues({})
    setResult(null)
    setSubmittedInput(null)
    setError(null)
    setDemoStatus(null)
    setDemoNotice(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const input = toPredictionInput(values)
      const prediction = await api.predict(input)
      setSubmittedInput(input)
      setResult(prediction)
      onPrediction(input, prediction)
    } catch (requestError: unknown) {
      const message = requestError instanceof ApiError
        ? requestError.message
        : requestError instanceof Error
          ? requestError.message
          : 'Prediction could not be completed.'
      setError(message)
      setResult(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Fitted Random Forest · 32 required inputs"
        title="Review an academic-risk signal"
        description="Enter the recorded student indicators below. The API validates every field and returns the existing fitted model’s result."
        action={(
          <div className="flex min-w-0 flex-col items-start gap-2 sm:items-end">
            <button
              aria-label="Generate a random sample student profile"
              className="button-secondary"
              onClick={generateDemo}
              type="button"
            >
              <Icon name="shuffle" className="h-4 w-4 text-mint" /> Demo Entry
            </button>
            <p className="max-w-[280px] text-xs leading-5 text-muted sm:text-right">
              Generate a random sample student profile for a quick demonstration.
            </p>
            {demoStatus && (
              <span className="source-chip text-mint" aria-label={demoStatus === 'modified' ? 'Demo Data, edited' : 'Demo Data'}>
                <span className="status-dot" />
                Demo Data{demoStatus === 'modified' ? ' · Edited' : ''}
              </span>
            )}
            <span className="source-chip">No G3 input · No target input</span>
          </div>
        )}
      />

      {demoNotice && (
        <p
          aria-live="polite"
          className="rounded-lg border border-mint/20 bg-mint/[0.06] px-4 py-2.5 text-xs leading-5 text-mint"
          role="status"
        >
          {demoNotice}
        </p>
      )}

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <form className="space-y-4" onSubmit={submit}>
          {predictionFieldGroups.map((group) => (
            <Panel className="p-5 sm:p-6" key={group.title}>
              <PanelHeading title={group.title} description={group.description} />
              <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                {group.fields.map((field) => (
                  <InputField
                    field={field}
                    key={field.name}
                    onChange={updateField}
                    value={values[field.name] ?? ''}
                  />
                ))}
              </div>
            </Panel>
          ))}
          {error && (
            <div className="rounded-lg border border-rose-300/20 bg-rose-300/[0.06] px-4 py-3 text-sm text-rose-100" role="alert">
              <span className="font-medium">Prediction unavailable. </span>{error}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel/50 p-4">
            <p className="max-w-xl text-xs leading-5 text-muted">All 32 supplied model inputs are required. G3 and the academic-risk label are excluded because they define the target.</p>
            <div className="flex gap-2">
              <button className="button-secondary" onClick={reset} type="button">Reset form</button>
              <button className="button-primary" disabled={submitting} type="submit">
                {submitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" /> Running model…</> : <>Run prediction <Icon name="arrow" className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-4 2xl:sticky 2xl:top-[100px]">
          {result && submittedInput ? (
            <PredictionResult input={submittedInput} result={result} onOpenCounseling={onOpenCounseling} />
          ) : (
            <Panel className="p-5 sm:p-6">
              <PanelHeading eyebrow="Prediction preview" title="Your result will appear here" description="Complete the required source fields and submit to the existing model endpoint." />
              <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-panel/35 px-5 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint/10 text-mint"><Icon name="shield" className="h-6 w-6" /></span>
                <p className="mt-4 text-sm font-medium text-slate-200">No prediction has been run</p>
                <p className="mt-2 max-w-sm text-xs leading-5 text-muted">The model returns an academic-risk proxy probability. It does not predict actual dropout.</p>
              </div>
              <DataFootnote>The result will use the fitted Scikit-learn pipeline and its default class decision rule.</DataFootnote>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
