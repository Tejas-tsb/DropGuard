import type { PredictionInput } from '../../types/api'

export type PredictionFieldName = keyof PredictionInput
export type FieldChoice = { value: string; label: string }

export type PredictionField = {
  name: PredictionFieldName
  label: string
  control: 'number' | 'select' | 'radio'
  help?: string
  min?: number
  max?: number
  /** Demo-only typical-value hints; form validation continues to use min/max. */
  demoMax?: number
  demoMode?: number
  choices?: readonly FieldChoice[]
}

export interface PredictionFieldGroup {
  title: string
  description: string
  fields: PredictionField[]
}

const choices = (...values: string[]): FieldChoice[] => values.map((value) => ({ value, label: value.replaceAll('_', ' ') }))
const yesNo = choices('yes', 'no')
const ratingChoices = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, index) => String(min + index))

export const predictionFieldGroups: PredictionFieldGroup[] = [
  {
    title: 'Student profile',
    description: 'Basic school and student characteristics recorded in the source dataset.',
    fields: [
      { name: 'school', label: 'School', control: 'select', choices: choices('GP', 'MS') },
      { name: 'sex', label: 'Recorded sex', control: 'radio', choices: choices('F', 'M') },
      { name: 'age', label: 'Age', control: 'number', min: 15, max: 22, demoMode: 17 },
      { name: 'address', label: 'Home address area', control: 'select', choices: choices('U', 'R'), help: 'U = urban, R = rural in the source data.' },
      { name: 'famsize', label: 'Family size', control: 'select', choices: choices('LE3', 'GT3'), help: 'LE3 = three or fewer; GT3 = more than three.' },
    ],
  },
  {
    title: 'Family and learning support',
    description: 'Education background, school choice and support indicators.',
    fields: [
      { name: 'Pstatus', label: 'Parents’ cohabitation status', control: 'select', choices: choices('T', 'A'), help: 'T = living together, A = apart in the source labels.' },
      { name: 'Medu', label: 'Mother’s education level', control: 'select', choices: choices(...ratingChoices(0, 4)) },
      { name: 'Fedu', label: 'Father’s education level', control: 'select', choices: choices(...ratingChoices(0, 4)) },
      { name: 'Mjob', label: 'Mother’s job category', control: 'select', choices: choices('teacher', 'health', 'services', 'at_home', 'other') },
      { name: 'Fjob', label: 'Father’s job category', control: 'select', choices: choices('teacher', 'health', 'services', 'at_home', 'other') },
      { name: 'reason', label: 'Reported reason for school choice', control: 'select', choices: choices('course', 'reputation', 'home', 'other') },
      { name: 'guardian', label: 'Primary guardian', control: 'select', choices: choices('mother', 'father', 'other') },
      { name: 'schoolsup', label: 'Extra school support', control: 'radio', choices: yesNo },
      { name: 'famsup', label: 'Family educational support', control: 'radio', choices: yesNo },
      { name: 'paid', label: 'Paid extra classes', control: 'radio', choices: yesNo },
      { name: 'activities', label: 'Extracurricular activities', control: 'radio', choices: yesNo },
      { name: 'nursery', label: 'Attended nursery school', control: 'radio', choices: yesNo },
      { name: 'higher', label: 'Wants higher education', control: 'radio', choices: yesNo },
      { name: 'internet', label: 'Internet access at home', control: 'radio', choices: yesNo },
      { name: 'romantic', label: 'Romantic relationship recorded', control: 'radio', choices: yesNo },
    ],
  },
  {
    title: 'Academic progress',
    description: 'Prior academic indicators and the first two grading-period marks.',
    fields: [
      { name: 'traveltime', label: 'Travel-time category', control: 'select', choices: choices(...ratingChoices(1, 4)) },
      { name: 'studytime', label: 'Study-time category', control: 'select', choices: choices(...ratingChoices(1, 4)), help: 'Enter the source dataset’s 1–4 category.' },
      { name: 'failures', label: 'Previous class failures', control: 'number', min: 0, max: 3, demoMode: 0 },
      { name: 'absences', label: 'Recorded absences', control: 'number', min: 0, demoMax: 20, demoMode: 3 },
      { name: 'G1', label: 'First-period grade (G1)', control: 'number', min: 0, max: 20, demoMode: 12 },
      { name: 'G2', label: 'Second-period grade (G2)', control: 'number', min: 0, max: 20, demoMode: 12 },
    ],
  },
  {
    title: 'Daily life and wellbeing indicators',
    description: 'Self-reported scales in the source data. These values are not diagnoses.',
    fields: [
      { name: 'famrel', label: 'Family relationship rating', control: 'select', choices: choices(...ratingChoices(1, 5)) },
      { name: 'freetime', label: 'Free-time rating', control: 'select', choices: choices(...ratingChoices(1, 5)) },
      { name: 'goout', label: 'Going-out rating', control: 'select', choices: choices(...ratingChoices(1, 5)) },
      { name: 'Dalc', label: 'Weekday alcohol-use rating', control: 'select', choices: choices(...ratingChoices(1, 5)) },
      { name: 'Walc', label: 'Weekend alcohol-use rating', control: 'select', choices: choices(...ratingChoices(1, 5)) },
      { name: 'health', label: 'Self-reported health rating', control: 'select', choices: choices(...ratingChoices(1, 5)) },
    ],
  },
]

export const allPredictionFields = predictionFieldGroups.flatMap((group) => group.fields)

// The prediction payload contains the metadata's 32 inputs only. G3 and
// academic_risk are deliberately not represented in this form configuration.
