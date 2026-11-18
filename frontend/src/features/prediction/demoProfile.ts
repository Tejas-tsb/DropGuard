import {
  allPredictionFields,
  type PredictionField,
  type PredictionFieldName,
} from './fields'

export type DemoProfile = Record<PredictionFieldName, string>
export type DemoProfileValues = Partial<Record<PredictionFieldName, string>>

function randomUnit(): number {
  const value = new Uint32Array(1)
  globalThis.crypto.getRandomValues(value)
  return value[0] / 0x1_0000_0000
}

function randomIndex(length: number): number {
  return Math.floor(randomUnit() * length)
}

function sampleInteger(min: number, max: number, mode?: number): number {
  if (min === max) return min

  // A triangular distribution favors typical values while retaining the full
  // valid range. The UI field definitions remain the source of range truth.
  const peak = Math.min(max, Math.max(min, mode ?? (min + max) / 2))
  const range = max - min
  const split = (peak - min) / range
  const random = randomUnit()
  const sampled = random < split
    ? min + Math.sqrt(random * range * (peak - min))
    : max - Math.sqrt((1 - random) * range * (max - peak))
  return Math.min(max, Math.max(min, Math.floor(sampled)))
}

function sampleField(field: PredictionField): string {
  if (field.control === 'number') {
    const min = field.min ?? 0
    const max = field.demoMax ?? field.max
    if (max === undefined) {
      throw new Error(`Demo range is not configured for ${field.name}.`)
    }
    return String(sampleInteger(min, max, field.demoMode))
  }

  const options = field.choices ?? []
  if (options.length === 0) {
    throw new Error(`No demo choices are configured for ${field.name}.`)
  }
  return options[randomIndex(options.length)].value
}

function matchesPrevious(candidate: DemoProfile, previous?: DemoProfileValues): boolean {
  return previous !== undefined
    && allPredictionFields.every((field) => candidate[field.name] === previous[field.name])
}

function ensureDifferent(candidate: DemoProfile, previous?: DemoProfileValues): DemoProfile {
  if (!matchesPrevious(candidate, previous)) return candidate

  const field = allPredictionFields[randomIndex(allPredictionFields.length)]
  if (field.control === 'number') {
    const min = field.min ?? 0
    const max = field.demoMax ?? field.max ?? min
    const next = Number(candidate[field.name]) === max ? min : max
    candidate[field.name] = String(next)
  } else {
    const choices = field.choices ?? []
    const other = choices.find((choice) => choice.value !== candidate[field.name])
    if (other) candidate[field.name] = other.value
  }
  return candidate
}

/** Generate one complete, valid, randomized profile from the prediction UI schema. */
export function generateDemoProfile(previous?: DemoProfileValues): DemoProfile {
  const profile = {} as DemoProfile
  for (const field of allPredictionFields) {
    profile[field.name] = sampleField(field)
  }
  return ensureDifferent(profile, previous)
}
