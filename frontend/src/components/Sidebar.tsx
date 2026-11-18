import { Icon } from './Icon'
import type { PageId } from '../app/navigation'
import { navigationItems } from '../app/navigation'

export function Sidebar({
  activePage,
  onNavigate,
}: {
  activePage: PageId
  onNavigate: (page: PageId) => void
}) {
  return (
    <div className="flex h-full flex-col border-r border-line bg-sidebar px-4 py-5">
      <button
        className="flex items-center gap-3 px-2 text-left"
        onClick={() => onNavigate('overview')}
        type="button"
        aria-label="DropGuard overview"
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-ink">
          <Icon name="shield" className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-base font-semibold tracking-tight text-white">DropGuard</span>
          <span className="mt-0.5 block text-[11px] text-muted">Student support platform</span>
        </span>
      </button>

      <div className="mb-3 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/75">
        Workspace
      </div>
      <nav aria-label="Main navigation" className="space-y-1">
        {navigationItems.map((item) => {
          const selected = item.id === activePage
          return (
            <button
              key={item.id}
              aria-current={selected ? 'page' : undefined}
              className={`nav-item w-full ${selected ? 'nav-item-active' : ''}`}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
              {selected && <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-mint" />}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-5">
        <div className="rounded-xl border border-line bg-panel/70 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-mint">
            <Icon name="shield" className="h-4 w-4" />
            Academic-risk proxy
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            A signal based on the supplied model target. It does not measure or predict actual dropout.
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between px-2 text-[11px] text-muted/70">
          <span>DropGuard</span>
          <span>Phase 3</span>
        </div>
      </div>
    </div>
  )
}
