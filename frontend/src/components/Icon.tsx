import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'overview'
  | 'prediction'
  | 'analytics'
  | 'performance'
  | 'explainability'
  | 'counseling'
  | 'menu'
  | 'close'
  | 'arrow'
  | 'refresh'
  | 'shuffle'
  | 'shield'
  | 'users'
  | 'trend'
  | 'check'
  | 'calendar'
  | 'book'
  | 'spark'
  | 'info'

const paths: Record<IconName, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="14" y="10" width="7" height="11" rx="1" /><rect x="3" y="13" width="7" height="8" rx="1" /></>,
  prediction: <><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  analytics: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /><circle cx="7" cy="15" r="1" /><circle cx="11" cy="11" r="1" /><circle cx="14" cy="13" r="1" /><circle cx="20" cy="6" r="1" /></>,
  performance: <><path d="M4 19h16M6 16V9M12 16V5M18 16v-4" /><path d="M4 19h16" /></>,
  explainability: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /><path d="m5.5 5.5-2-2M18.5 5.5l2-2" /></>,
  counseling: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-2 2v-6a7.5 7.5 0 1 1 16-3.5Z" /><path d="M8 11h8M8 14h5" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3" /></>,
  shuffle: <><path d="m16 3 5 0 0 5M21 3l-7 7" /><path d="m16 16 5 5 0-5M21 21l-7-7" /><path d="M4 7h2.5c1.4 0 2.6.7 3.6 2l3.8 6c1 1.5 2.2 2 3.6 2H21M4 17h2.5c1.4 0 2.6-.7 3.6-2l.7-1" /></>,
  shield: <><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" /><circle cx="9.5" cy="7" r="3.5" /><path d="M17 11a3.5 3.5 0 0 0 0-7M21 20v-1.5a4 4 0 0 0-3-3.87" /></>,
  trend: <><path d="m4 16 5-5 4 3 7-8" /><path d="M14 6h6v6" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" /><path d="M4 17a2.5 2.5 0 0 1 2.5-2.5H20M8 7h8M8 10h6" /></>,
  spark: <><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
}

export function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
