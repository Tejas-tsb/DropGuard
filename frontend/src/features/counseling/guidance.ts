import type { PredictionInput, PredictionResponse } from '../../types/api'

export interface GuidanceItem {
  title: string
  detail: string
}

export function buildStudentGuidance(input: PredictionInput): GuidanceItem[] {
  const guidance: GuidanceItem[] = [
    {
      title: 'Start with the student’s perspective',
      detail: 'Ask what has felt manageable, what has felt difficult, and which kind of support would be useful right now.',
    },
    {
      title: 'Agree on one practical next step',
      detail: `The recorded study-time category is ${input.studytime} on the source scale. Discuss a realistic weekly routine together and review whether it helps.`,
    },
  ]

  if (input.failures > 0) {
    guidance.push({
      title: 'Plan a focused catch-up',
      detail: `The record includes ${input.failures} previous class failure${input.failures === 1 ? '' : 's'}. Identify the specific topics that need review and agree on a teacher check-in or practice plan.`,
    })
  }

  if (input.absences > 0) {
    guidance.push({
      title: 'Reconnect missed learning',
      detail: `${input.absences} absence${input.absences === 1 ? '' : 's'} are recorded. Ask whether any lessons were missed and help arrange notes, make-up work, or a brief follow-up with a teacher.`,
    })
  }

  const gradeChange = input.G2 - input.G1
  guidance.push({
    title: gradeChange >= 0 ? 'Build on recent progress' : 'Explore what changed',
    detail: gradeChange >= 0
      ? `The recorded grade moved from ${input.G1} at G1 to ${input.G2} at G2. Ask which study approaches or supports have been useful.`
      : `The recorded grade moved from ${input.G1} at G1 to ${input.G2} at G2. Explore what changed and choose one area where support could make coursework more manageable.`,
  })

  return guidance
}

export function resultSummary(result: PredictionResponse): string {
  if (result.predicted_class === 1) {
    return 'The model placed this record in the academic-risk proxy class. Use the result as a prompt for a supportive conversation and review the underlying information with care.'
  }
  return 'The model did not place this record in the academic-risk proxy class. Continue regular check-ins and respond to the student’s needs as they arise.'
}
