import type {
  AnalyticsDistribution,
  AnalyticsOverview,
  ConfusionMatrixResponse,
  FactorsAnalytics,
  FeatureImportanceResponse,
  GradesAnalytics,
  HealthResponse,
  ModelComparisonResponse,
  ModelMetricsResponse,
  PredictionInput,
  PredictionResponse,
  RocDataResponse,
} from '../types/api'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
// Production builds must receive VITE_API_BASE_URL from deployment settings.
// An empty base uses same-origin /api requests, which Vite proxies locally.
export const API_BASE_URL = (configuredBaseUrl || '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(message: string, status: number, detail: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

function detailMessage(detail: unknown): string | null {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const messages = detail.map((entry) => {
      if (!entry || typeof entry !== 'object') return String(entry)
      const item = entry as { loc?: unknown[]; msg?: unknown }
      const field = item.loc?.slice(1).join('.')
      return `${field ? `${field}: ` : ''}${String(item.msg ?? 'Invalid value')}`
    })
    return messages.join(' · ')
  }
  if (detail && typeof detail === 'object') {
    const item = detail as { message?: unknown; error?: unknown }
    if (typeof item.message === 'string') {
      return [item.message, typeof item.error === 'string' ? item.error : null]
        .filter(Boolean)
        .join(' ')
    }
  }
  return null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError('Could not reach the DropGuard API. Check that the backend is running.', 0, null)
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = body && typeof body === 'object' && 'detail' in body
      ? (body as { detail: unknown }).detail
      : body
    throw new ApiError(
      detailMessage(detail) ?? `The API returned HTTP ${response.status}.`,
      response.status,
      detail,
    )
  }
  return body as T
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),
  overview: () => request<AnalyticsOverview>('/api/analytics/overview'),
  distribution: () => request<AnalyticsDistribution>('/api/analytics/distribution'),
  grades: () => request<GradesAnalytics>('/api/analytics/grades'),
  factors: () => request<FactorsAnalytics>('/api/analytics/factors'),
  predict: (input: PredictionInput) => request<PredictionResponse>('/api/predict', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  metrics: () => request<ModelMetricsResponse>('/api/model/metrics'),
  comparison: () => request<ModelComparisonResponse>('/api/model/comparison'),
  confusionMatrix: () => request<ConfusionMatrixResponse>('/api/model/confusion-matrix'),
  rocData: () => request<RocDataResponse>('/api/model/roc-data'),
  featureImportance: () => request<FeatureImportanceResponse>('/api/model/feature-importance'),
}
