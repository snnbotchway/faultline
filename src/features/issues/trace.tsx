import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { StatsPeriod } from '@/api/issues'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { PERIODS, Trend, barHeights, markLabels, periodInfo, type Mark } from './trend'

/**
 * The shell every chart on a time axis shares: a baseline in the grid colour, the release rules
 * behind, and the chart's own marks (bars, blocks) standing on the baseline.
 */
export function TraceFrame({ height, marks, phoneMarks = true, className, children }: { height: number; marks?: Mark[]; phoneMarks?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cn('relative flex items-end gap-px border-b border-grid', className)} style={{ height: height + 1 }} aria-hidden>
      {marks && <ReleaseRules marks={marks} phone={phoneMarks} />}
      {children}
    </div>
  )
}

// Release rules through a chart, in the quiet grid colour. `phone={false}` hides them where the chart is too narrow for them.
export function ReleaseRules({ marks, phone = true }: { marks: Mark[]; phone?: boolean }) {
  return marks.map((mark, index) => <span key={index} data-mark className={cn('absolute inset-y-0 w-px bg-grid', !phone && 'max-lg:hidden')} style={{ left: `${mark.at * 100}%` }} />)
}

// Events per bucket as bars on a zero baseline. `marks` are positions (0 to 1) of releases on the same axis.
export function Trace({
  buckets,
  height,
  peak,
  trend = Trend.ongoing,
  marks,
  className,
}: {
  buckets: number[]
  height: number
  peak?: number
  trend?: Trend
  marks?: Mark[]
  className?: string
}) {
  const heights = barHeights(buckets, height, peak)
  return (
    <TraceFrame height={height} marks={marks} className={className}>
      {heights.map((barHeight, index) => (
        <span
          key={index}
          className={cn(
            'min-w-0 flex-1',
            trend === Trend.new ? 'bg-trend-new' : trend === Trend.spiking && index === heights.length - 1 ? 'bg-trend-spiking' : 'bg-foreground/50',
          )}
          style={{ height: barHeight }}
        />
      ))}
    </TraceFrame>
  )
}

// The names of the releases above a chart's marks, in the space its parent leaves at the top (`pt-5`).
// Releases too close to name apart share one label.
export function MarkLabels({ marks }: { marks: Mark[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(() => setWidth(node.clientWidth))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className="absolute inset-x-0 top-0">
      {markLabels(marks, width).map((label) => (
        <span
          key={label.at}
          className="absolute top-0 max-w-full truncate pl-1 font-mono text-xs whitespace-nowrap text-muted-foreground"
          style={{ left: label.left }}
          title={label.releases.length > 1 ? label.releases.join(', ') : undefined}
        >
          {label.text}
        </span>
      ))}
    </div>
  )
}

// A chart with its releases named above the marks.
export function ReleaseTrace({ buckets, marks, height, className }: { buckets: number[]; marks: Mark[]; height: number; className?: string }) {
  return (
    <div className={cn('relative pt-5', className)}>
      <MarkLabels marks={marks} />
      <Trace buckets={buckets} marks={marks} height={height} />
    </div>
  )
}

export function PeriodToggle({ period, onChange }: { period: StatsPeriod; onChange: (period: StatsPeriod) => void }) {
  const t = useT().issues.inbox
  return (
    <div className="flex border" role="group" aria-label={t.period}>
      {PERIODS.map((item) => periodInfo(item.value)).map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={item.value === period}
          onClick={() => onChange(item.value)}
          className={cn('mono h-6 px-2 max-lg:h-11 max-lg:px-3', item.value === period ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
