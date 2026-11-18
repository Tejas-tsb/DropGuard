import { Component, lazy, Suspense, useState, type ErrorInfo, type ReactNode } from 'react'
import { Icon } from './components/Icon'
import { Sidebar } from './components/Sidebar'
import { useApiQuery } from './hooks/useApiQuery'
import { api } from './services/api'
import type { PageId } from './app/navigation'
import { navigationItems } from './app/navigation'
import type { PredictionSession } from './types/api'
import { LoadingState } from './components/States'

const OverviewPage = lazy(() => import('./features/overview/OverviewPage').then((module) => ({ default: module.OverviewPage })))
const PredictionPage = lazy(() => import('./features/prediction/PredictionPage').then((module) => ({ default: module.PredictionPage })))
const StudentAnalyticsPage = lazy(() => import('./features/analytics/StudentAnalyticsPage').then((module) => ({ default: module.StudentAnalyticsPage })))
const ModelPerformancePage = lazy(() => import('./features/performance/ModelPerformancePage').then((module) => ({ default: module.ModelPerformancePage })))
const ExplainabilityPage = lazy(() => import('./features/explainability/ExplainabilityPage').then((module) => ({ default: module.ExplainabilityPage })))
const CounselingPage = lazy(() => import('./features/counseling/CounselingPage').then((module) => ({ default: module.CounselingPage })))

class PageErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dashboard view failed to render', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel p-8" role="alert">
          <p className="eyebrow">View error</p>
          <h2 className="mt-2 text-lg font-semibold text-white">This view could not be displayed</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Try another section or reload the page. No student data was changed.
          </p>
          <button className="button-secondary mt-5" onClick={() => window.location.reload()} type="button">
            Reload dashboard
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [lastPrediction, setLastPrediction] = useState<PredictionSession | null>(null)
  const { data: health, error: healthError, loading: healthLoading, reload: retryHealth } = useApiQuery(api.health)
  const page = navigationItems.find((item) => item.id === activePage) ?? navigationItems[0]

  const navigate = (nextPage: PageId) => {
    setActivePage(nextPage)
    setMobileNavOpen(false)
  }

  return (
    <div className="min-h-screen bg-ink text-white lg:flex">
      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/55 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[270px] transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:block lg:h-screen lg:shrink-0 lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar activePage={activePage} onNavigate={navigate} />
      </aside>

      <div className="min-h-screen min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-ink/95 backdrop-blur-sm">
          <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-7 xl:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label="Open navigation"
                className="icon-button lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                type="button"
              >
                <Icon name="menu" className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-muted">
                  <span className="hidden sm:inline">DropGuard</span>
                  <span aria-hidden="true" className="hidden text-muted/50 sm:inline">/</span>
                  <span className="truncate">{page.label}</span>
                </div>
                <h1 className="mt-1 truncate text-base font-semibold tracking-tight text-white sm:text-lg">
                  {page.title}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-muted">API status</p>
                <p className="mt-0.5 text-xs text-slate-200">
                  {healthError ? 'Unavailable' : healthLoading ? 'Connecting' : health?.status === 'ok' ? 'Connected' : 'Unknown'}
                </p>
              </div>
              <button
                aria-label="Retry API connection"
                className="icon-button"
                onClick={retryHealth}
                title="Check API connection"
                type="button"
              >
                <span className={`h-2 w-2 rounded-full ${healthError || (health && health.status !== 'ok') ? 'bg-rose-300' : healthLoading ? 'animate-pulse bg-amber-300' : 'bg-mint'}`} />
                <Icon name="refresh" className="h-4 w-4 text-muted" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
          <PageErrorBoundary key={activePage}>
            <Suspense fallback={<LoadingState label="Preparing this workspace…" />}>
              {activePage === 'overview' && <OverviewPage />}
              {activePage === 'prediction' && (
                <PredictionPage
                  onPrediction={(input, result) => setLastPrediction({ input, result })}
                  onOpenCounseling={() => navigate('counseling')}
                />
              )}
              {activePage === 'analytics' && <StudentAnalyticsPage />}
              {activePage === 'performance' && <ModelPerformancePage />}
              {activePage === 'explainability' && <ExplainabilityPage />}
              {activePage === 'counseling' && <CounselingPage session={lastPrediction} onOpenPrediction={() => navigate('prediction')} />}
            </Suspense>
          </PageErrorBoundary>
          <footer className="mt-10 flex flex-col gap-2 border-t border-line pt-5 text-[11px] leading-5 text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>DropGuard · Academic-risk proxy for supportive educational conversations</span>
            <span>{health?.status === 'ok' ? 'Live data from the supplied backend' : 'Waiting for the API'}</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
