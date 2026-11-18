import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`panel ${className}`}>{children}</section>
}

export function PanelHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-1 text-base font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 max-w-xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  detail,
  icon,
  accent = false,
}: {
  label: string
  value: string
  detail: string
  icon: ReactNode
  accent?: boolean
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${accent ? 'bg-mint/10 text-mint' : 'bg-white/[0.04] text-slate-300'}`}>
          {icon}
        </span>
      </div>
    </Panel>
  )
}

export function LoadingState({ label = 'Loading verified data…' }: { label?: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-muted" role="status">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-mint" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center" role="alert">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-400/10 text-rose-200">
        <Icon name="info" className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-white">We couldn’t load this view</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-muted">{message}</p>
      <button className="button-secondary mt-5" onClick={onRetry} type="button">
        <Icon name="refresh" className="h-4 w-4" /> Retry
      </button>
    </div>
  )
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-5 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.04] text-mint">
        <Icon name="info" className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{detail}</p>
    </div>
  )
}

export function DataFootnote({ children }: { children: ReactNode }) {
  return <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted"><Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint/80" />{children}</p>
}
