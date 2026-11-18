export type RiskClass = 0 | 1
export type GradeName = 'G1' | 'G2' | 'G3'

export interface HealthResponse {
  status: string
  model_loaded: boolean
  model_load_error: string | null
}

export interface RiskDistributionItem {
  class: RiskClass
  count: number
  percentage: number
}

export interface AnalyticsOverview {
  dataset: string
  row_count: number
  input_feature_count: number
  missing_cell_count: number
  target: string
  target_definition: string
  target_is_dropout: false
  academic_risk_distribution: RiskDistributionItem[]
  source: string
}

export interface ValueCount {
  value: string | number | null
  count: number
}

export interface AnalyticsDistribution {
  row_count: number
  categorical: Record<string, ValueCount[]>
  numeric: Record<string, ValueCount[]>
  academic_risk: ValueCount[]
  source: string
}

export interface GradeSummary {
  count: number
  mean: number
  median: number
  standard_deviation: number
  minimum: number
  maximum: number
}

export interface GradesAnalytics {
  grades: Record<GradeName, GradeSummary>
  by_academic_risk: Array<{
    academic_risk: RiskClass
    student_count: number
    grade_means: Record<GradeName, number>
  }>
  note: string
}

export interface FactorGroup {
  value: string | number | null
  student_count: number
  academic_risk_count: number
  academic_risk_rate: number
}

export interface FactorsAnalytics {
  target_definition: string
  factors: Record<string, FactorGroup[]>
  interpretation: string
}

export interface PredictionInput {
  school: 'GP' | 'MS'
  sex: 'F' | 'M'
  age: number
  address: 'R' | 'U'
  famsize: 'GT3' | 'LE3'
  Pstatus: 'A' | 'T'
  Medu: number
  Fedu: number
  Mjob: 'at_home' | 'health' | 'other' | 'services' | 'teacher'
  Fjob: 'at_home' | 'health' | 'other' | 'services' | 'teacher'
  reason: 'course' | 'home' | 'other' | 'reputation'
  guardian: 'father' | 'mother' | 'other'
  traveltime: number
  studytime: number
  failures: number
  schoolsup: 'no' | 'yes'
  famsup: 'no' | 'yes'
  paid: 'no' | 'yes'
  activities: 'no' | 'yes'
  nursery: 'no' | 'yes'
  higher: 'no' | 'yes'
  internet: 'no' | 'yes'
  romantic: 'no' | 'yes'
  famrel: number
  freetime: number
  goout: number
  Dalc: number
  Walc: number
  health: number
  absences: number
  G1: number
  G2: number
}

export interface PredictionResponse {
  predicted_class: RiskClass
  academic_risk_probability: number
  risk_category: 'No elevated academic risk indicated' | 'Elevated academic risk'
  classification_threshold: number
  classification_rule: string
  target_definition: string
}

export interface PerClassMetric {
  class: RiskClass
  precision: number
  recall: number
  f1_score: number
  support: number
}

export interface TestMetrics {
  accuracy: number
  precision: number
  recall: number
  f1_score: number
  roc_auc: number
  training_time_seconds?: number
}

export interface CrossValidationMetrics {
  accuracy: number
  precision: number
  recall: number
  f1_score: number
  roc_auc: number
}

export interface ModelMetricsResponse {
  model_name: string
  target_definition: string
  test: TestMetrics & {
    training_time_seconds: number
    per_class_metrics: PerClassMetric[]
    sample_count: number
    source: string
  }
  cross_validation: CrossValidationMetrics & { source: string }
  classification_rule: string
  classification_threshold: number
  limitation: string
}

export interface ModelComparisonItem {
  model: string
  test: TestMetrics & { training_time_seconds: number }
  cross_validation: CrossValidationMetrics
  held_out_predictions: TestMetrics & {
    per_class_metrics: PerClassMetric[]
    sample_count: number
  }
  per_class_metrics: PerClassMetric[]
  sample_count: number
}

export interface ModelComparisonResponse {
  models: ModelComparisonItem[]
  sources: string[]
}

export interface ConfusionMatrixModel {
  model: string
  labels: [RiskClass, RiskClass]
  matrix: [[number, number], [number, number]]
  matrix_orientation: string
  true_negative: number
  false_positive: number
  false_negative: number
  true_positive: number
  sample_count: number
  accuracy: number
  precision: number
  recall: number
  f1_score: number
  per_class_metrics: PerClassMetric[]
}

export interface ConfusionMatrixResponse {
  available: boolean
  data: {
    sample_count: number
    positive_label: RiskClass
    models: ConfusionMatrixModel[]
  } | null
  source: string
}

export interface RocModel {
  model: string
  auc: number
  fpr: number[]
  tpr: number[]
  thresholds: Array<number | null>
  sample_count: number
}

export interface RocDataResponse {
  available: boolean
  data: {
    sample_count: number
    positive_label: RiskClass
    models: RocModel[]
  } | null
  source: string
}

export interface FeatureImportanceItem {
  feature: string
  importance: number
}

export interface FeatureImportanceResponse {
  method: string
  interpretation: string
  input_feature_importance: FeatureImportanceItem[]
  transformed_feature_importance: Array<{
    transformed_feature: string
    input_feature: string | null
    importance: number
  }>
}

export interface PredictionSession {
  input: PredictionInput
  result: PredictionResponse
}
