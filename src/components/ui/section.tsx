import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// A labelled part of a page: a small-caps heading with an optional count and action, over its content.
export function Section({ label, count, action, className, children }: { label: string; count?: number; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={className} aria-label={label}>
      <div className="flex h-9 items-center gap-2 border-b">
        <h2 className="label-caps flex items-center gap-2">
          {label}
          {count !== undefined && <span className="text-foreground">{count}</span>}
        </h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  )
}

// One figure in a row of figures, under its label. `tone` colours the figure.
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps truncate">{label}</dt>
      <dd className={cn('mono mt-1 text-xl leading-none font-semibold lg:text-2xl', tone)}>{value}</dd>
    </div>
  )
}
