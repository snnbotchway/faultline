import { CircleAlert, Repeat, TrendingUp } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import type { TransactionGroup } from '@/api/performance'
import { Skeleton } from '@/components/ui/skeleton'
import { localized, useT } from '@/i18n'
import { dayLabel } from '@/features/issues/format'
import { MarkLabels, Trace } from '@/features/issues/trace'
import { Trend, type Axis, type Mark } from '@/features/issues/trend'
import { cn } from '@/lib/utils'
import type { Transaction } from './data'
import { formatFactor, formatMs, formatPercent, formatTimes } from './format'
import type { Regression } from './measures'

// An identifier that may wrap after a dot, underscore, slash or colon, and never in the middle of a word.
export function Breakable({ text }: { text: string }) {
  return (
    <>
      {text.split(/(?<=[._/:])/).map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <wbr />}
          {part}
        </Fragment>
      ))}
    </>
  )
}

// A transaction's name: the method or kind, then the route.
export function TransactionName({ group, className }: { group: Pick<TransactionGroup, 'method' | 'op' | 'transaction'>; className?: string }) {
  return (
    <span className={cn('mono min-w-0', className)}>
      <span className="font-semibold">{group.method || group.op}</span> <Breakable text={group.transaction} />
    </span>
  )
}

export function Slower({ slower, since }: { slower: Regression; since?: string }) {
  const t = useT().performance
  return (
    <span className="flex items-center gap-1 text-sm">
      <TrendingUp className="size-3 shrink-0 text-trend-spiking" />
      <span>
        {t.slower(<span className="mono font-semibold">{formatFactor(slower.factor)}</span>, since)}
      </span>
    </span>
  )
}

// What is wrong with a transaction, each as an icon and words.
export function Signals({ transaction, className }: { transaction: Transaction; className?: string }) {
  const t = useT().performance
  const worst = Math.max(0, ...transaction.repeats.map((pattern) => pattern.spansPerTxn))
  if (!worst && !transaction.slower && !transaction.failing) return null
  return (
    <span className={cn('flex flex-wrap gap-x-3 gap-y-1 text-sm', className)}>
      {worst > 0 && (
        <span className="flex items-center gap-1">
          <Repeat className="size-3 shrink-0 text-trend-spiking" />
          <span>{t.queryRepeats(<span className="mono font-semibold">{formatTimes(worst)}</span>)}</span>
        </span>
      )}
      {transaction.slower && <Slower slower={transaction.slower} since={transaction.since} />}
      {transaction.failing && (
        <span className="flex items-center gap-1">
          <CircleAlert className="size-3 shrink-0 text-destructive" />
          <span>{t.failedShare(<span className="mono font-semibold">{formatPercent(transaction.group.errorRate)}</span>)}</span>
        </span>
      )}
    </span>
  )
}

const SCALE_MIN = 1
const SCALE_MAX = 30_000
const SCALE_STEPS = [
  { at: 1, label: '1 ms' },
  { at: 10, label: '10 ms' },
  { at: 100, label: '100 ms' },
  { at: 1000, label: '1 s' },
  { at: 10_000, label: '10 s' },
]
const onScale = (value: number) => Math.min(1, Math.max(0, Math.log10(Math.max(value, SCALE_MIN) / SCALE_MIN) / Math.log10(SCALE_MAX / SCALE_MIN)))

// One duration scale for every row of a list, labelled once above the rows. Logarithmic: endpoints run
// from a few milliseconds to several seconds, and a linear scale would flatten all but the slowest.
export function DurationScale({ className }: { className?: string }) {
  return (
    <div className={cn('relative h-4 font-mono text-xs whitespace-nowrap text-muted-foreground', className)} aria-hidden>
      {SCALE_STEPS.map((step) => (
        <span key={step.at} className="absolute top-0 -translate-x-1/2 first:translate-x-0" style={{ left: `${onScale(step.at) * 100}%` }}>
          {step.label}
        </span>
      ))}
    </div>
  )
}

// Typical (p50) to slow (p95) on the shared scale.
export function DurationBar({ p50, p95, className }: { p50: number; p95: number; className?: string }) {
  return (
    <div className={cn('relative h-3 border-b border-grid', className)} aria-hidden>
      {SCALE_STEPS.slice(1).map((step) => (
        <span key={step.at} className="absolute inset-y-0 w-px bg-grid" style={{ left: `${onScale(step.at) * 100}%` }} />
      ))}
      <span className="absolute bottom-0 left-0 h-2 bg-foreground/25" style={{ width: `${onScale(p50) * 100}%` }} />
      <span className="absolute bottom-0 h-2 bg-foreground/60" style={{ left: `${onScale(p50) * 100}%`, width: `${Math.max(0.5, (onScale(p95) - onScale(p50)) * 100)}%` }} />
    </div>
  )
}

// Room for "2 min 54 s", the longest a language writes a peak of a minute or more.
const AXIS_WIDTH = 'w-20'
const dayOfMonth = localized((tag) => new Intl.DateTimeFormat(tag, { day: 'numeric' }))
// The most characters a day's column holds on a 375px phone. A longer word for today runs back over the day before,
// whose label then gives way.
const DAY_COLUMN_CHARACTERS = 5

// Seven days of a duration on the shared time axis: the peak and zero are labelled with their unit,
// every day is named, and releases are marked. A day with no requests stays on the zero line. The
// latest day of a transaction that got slower is drawn in the spiking colour, as in the inbox.
export function WeekChart({ buckets, marks, axis, slower, height, className }: { buckets: number[]; marks: Mark[]; axis: Axis; slower: boolean; height: number; className?: string }) {
  const t = useT()
  const peak = Math.max(...buckets, 0)
  return (
    <div className={cn('flex', className)} role="img" aria-label={t.performance.weekChart(axis.count, formatMs(peak))}>
      <div className={cn('mono shrink-0 pt-5 pr-2 text-right text-xs whitespace-nowrap text-muted-foreground', AXIS_WIDTH)} aria-hidden>
        <div className="flex flex-col justify-between" style={{ height }}>
          <span className="-translate-y-1/2">{formatMs(peak)}</span>
          <span className="translate-y-1/2">0</span>
        </div>
      </div>
      <div className="min-w-0 flex-1" aria-hidden>
        <div className="relative pt-5">
          <MarkLabels marks={marks} />
          <Trace buckets={buckets} marks={marks} height={height} trend={slower ? Trend.spiking : Trend.ongoing} className="border-t border-b-border" />
        </div>
        <div className="mono mt-1 flex gap-px text-xs text-muted-foreground">
          {buckets.map((_, index) => {
            const last = buckets.length - 1
            const day = dayOfMonth().format((axis.start + index * axis.size) * 1000)
            // Today is right-aligned, so a long word grows to the left, inside the chart.
            if (index === last)
              return (
                <span key={index} className="flex min-w-0 flex-1 justify-end whitespace-nowrap">
                  {t.common.time.today}
                </span>
              )
            return (
              <span key={index} className={cn('min-w-0 flex-1 truncate text-center', index === last - 1 && t.common.time.today.length > DAY_COLUMN_CHARACTERS && 'max-md:invisible')}>
                {/* On a phone the first day is its number alone, as the others are, so it is not cut. */}
                {index === 0 ? (
                  <>
                    <span className="md:hidden">{day}</span>
                    <span className="max-md:hidden">{dayLabel(axis.start)}</span>
                  </>
                ) : (
                  day
                )}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('label-caps', className)}>{children}</h3>
}

export function Stat({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="label-caps">{label}</dt>
      <dd className="mono mt-1 font-medium text-foreground tabular-nums">{children}</dd>
    </div>
  )
}

export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  const t = useT().performance
  return (
    <ul aria-busy aria-label={t.loading}>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="space-y-2 border-b px-3 py-3 md:px-4">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-2" />
          <Skeleton className="h-3 w-1/3" />
        </li>
      ))}
    </ul>
  )
}

// What to do when no transaction has request details: GlitchTip only keeps its spans with cold storage on,
// which the README tells an admin how to turn on.
export function SpanStorageHint() {
  return <p className="text-sm text-muted-foreground">{useT().performance.askAdmin}</p>
}
