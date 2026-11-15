import { LogLevel } from '@/api/logs'
import { hourLabel } from '@/features/issues/format'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { bucketTotal, type Bucket } from './data'
import { dayOf } from './format'
import { LogLevelGlyph } from './level'

const DAY_HOURS = 24
const MIN_BAR = 2

// Logs per hour on a zero baseline, errors and warnings stacked on the rest in their level colours, with
// a key in the level shapes. An hour is as fine as the backend counts. Picking a bar narrows the list to
// that hour; `dim` fades the chart when it does not follow the list's filters.
export function LogHistogram({ buckets, height, hour, dim, onPick }: { buckets: Bucket[]; height: number; hour: number | undefined; dim: boolean; onPick: (hour: number | undefined) => void }) {
  const t = useT().logs
  const peak = Math.max(0, ...buckets.map(bucketTotal))
  const px = (count: number) => (count <= 0 ? 0 : Math.max(MIN_BAR, Math.round((count / peak) * height)))
  const first = buckets[0]!.start
  return (
    <div className={cn(dim && 'dimmed')}>
      <div className="flex items-end gap-px border-b border-grid" style={{ height: height + 1 }} role="group" aria-label={t.logsPerHour}>
        {buckets.map((bucket) => {
          const picked = hour === bucket.start
          const label = t.histogram.bar(`${buckets.length > DAY_HOURS ? `${dayOf(bucket.start * 1000)} ` : ''}${hourLabel(bucket.start)}`, bucketTotal(bucket))
          return (
            <button
              key={bucket.start}
              type="button"
              aria-pressed={picked}
              aria-label={label}
              title={label}
              onClick={() => onPick(picked ? undefined : bucket.start)}
              className={cn('flex h-full min-w-0 flex-1 flex-col-reverse justify-start hover:bg-accent', hour !== undefined && !picked && 'dimmed')}
            >
              <span className="w-full bg-foreground/40" style={{ height: px(bucket.other) }} />
              <span className="w-full bg-level-warning" style={{ height: px(bucket.warnings) }} />
              <span className="w-full bg-level-error" style={{ height: px(bucket.errors) }} />
            </button>
          )
        })}
      </div>
      <div className="mono mt-1 flex justify-between text-xs text-muted-foreground" aria-hidden>
        <span>{buckets.length > DAY_HOURS ? dayOf(first * 1000) : hourLabel(first)}</span>
        <span className="flex items-center gap-2">
          <LogLevelGlyph level={LogLevel.error} />
          {LogLevel.error}
          <LogLevelGlyph level={LogLevel.warn} />
          {LogLevel.warn}
          <span className="ml-2">{peak > 0 ? t.histogram.peak(peak) : t.histogram.none}</span>
        </span>
        <span>{t.histogram.now}</span>
      </div>
    </div>
  )
}
