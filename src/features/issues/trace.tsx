import type { StatsPeriod } from '@/api/issues'
import { cn } from '@/lib/utils'
import { PERIODS, Trend, barHeights, type Mark } from './trend'

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
    <div className={cn('relative flex items-end gap-px border-b border-grid', className)} style={{ height: height + 1 }} aria-hidden>
      {marks?.map((mark) => (
        <span key={mark.at} className="absolute inset-y-0 w-px bg-brand/45" style={{ left: `${mark.at * 100}%` }} />
      ))}
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
    </div>
  )
}

// A chart with its releases named above the marks.
export function ReleaseTrace({ buckets, marks, height, className }: { buckets: number[]; marks: Mark[]; height: number; className?: string }) {
  return (
    <div className={cn('relative pt-5', className)}>
      {marks.map((mark) => (
        <span
          key={mark.at}
          className={cn('absolute top-0 font-mono text-xs whitespace-nowrap text-brand', mark.at > 0.8 ? '-translate-x-full pr-1' : 'pl-1')}
          style={{ left: `${mark.at * 100}%` }}
        >
          {mark.label}
        </span>
      ))}
      <Trace buckets={buckets} marks={marks} height={height} />
    </div>
  )
}

export function PeriodToggle({ period, onChange }: { period: StatsPeriod; onChange: (period: StatsPeriod) => void }) {
  return (
    <div className="flex border" role="group" aria-label="Period">
      {PERIODS.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={item.value === period}
          onClick={() => onChange(item.value)}
          className={cn('mono h-6 px-2 max-lg:h-9 max-lg:px-3', item.value === period ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
