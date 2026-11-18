import type { ReactNode } from 'react'

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[28px]">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
