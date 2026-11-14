import { Link } from '@tanstack/react-router'
import type { Check } from '@/api/monitors'
import { TraceFrame } from '@/features/issues/trace'
import type { Mark } from '@/lib/axis'
import { cn } from '@/lib/utils'
import { HEALTH, UptimeTab } from './describe'
import { Health, checkHealth, slowOver, type Downtime } from './health'

// Health by shape as well as colour: square down, diamond flapping, triangle slow, disc up, ring not reported yet.
export function HealthGlyph({ health, className }: { health: Health; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" role="img" aria-label={HEALTH[health].label} className={cn('size-3 shrink-0', HEALTH[health].color, className)}>
      {health === Health.down ? (
        <rect width="10" height="10" fill="currentColor" />
      ) : health === Health.flapping ? (
        <path d="M5 0 10 5 5 10 0 5Z" fill="currentColor" />
      ) : health === Health.slow ? (
        <path d="M5 0.5 10 9.5H0Z" fill="currentColor" />
      ) : health === Health.up ? (
        <circle cx="5" cy="5" r="4.5" fill="currentColor" />
      ) : (
        <circle cx="5" cy="5" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      )}
    </svg>
  )
}

// A square for a stretch of downtime: filled while it lasts, an outline once it is over.
export function DowntimeGlyph({ ongoing }: { ongoing: boolean }) {
  return (
    <svg viewBox="0 0 10 10" className={cn('size-3 shrink-0', HEALTH[Health.down].color)} role="img" aria-label={ongoing ? 'Down now' : 'Recovered'}>
      {ongoing ? <rect width="10" height="10" fill="currentColor" /> : <rect x="0.75" y="0.75" width="8.5" height="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  )
}

/**
 * One bar per check, oldest first: grey passed, amber passed but slow, red failed (full height).
 * When any check was slow the bars are scaled to the timeout so the slow line sits where it means
 * something; otherwise to their own peak.
 */
export function CheckBars({ checks, timeout, height, line = false, className }: { checks: Check[]; timeout: number | null | undefined; height: number; line?: boolean; className?: string }) {
  const over = slowOver(timeout)
  const peak = Math.max(1, ...checks.filter((check) => check.isUp).map((check) => check.responseTime ?? 0))
  const toLimit = over !== undefined && peak > over
  const ceiling = toLimit ? timeout! * 1000 : peak
  return (
    <TraceFrame height={height} className={className}>
      {[...checks].reverse().map((check) => (
        <span
          key={check.startCheck}
          className={cn('min-w-0 flex-1', HEALTH[checkHealth(check, timeout)].bar)}
          style={{ height: check.isUp ? Math.max(2, Math.round((Math.min(check.responseTime ?? 0, ceiling) / ceiling) * height)) : height }}
        />
      ))}
      {/* Drawn in the text colour with a paper edge, so it stays visible over slow (amber) bars. */}
      {line && toLimit && <span className="absolute inset-x-0 h-0.5 bg-foreground outline-1 outline-background" style={{ bottom: `calc(${(over / ceiling) * 100}% - 1px)` }} />}
    </TraceFrame>
  )
}

// Downtime on the shared time axis: a baseline that is always there and a block for every stretch down.
export function DowntimeStrip({
  downtimes,
  from,
  to,
  marks = [],
  waiting = false,
  height = 20,
  className,
}: {
  downtimes: Downtime[]
  from: number
  to: number
  marks?: Mark[]
  waiting?: boolean
  height?: number
  className?: string
}) {
  const width = to - from
  return (
    // A phone's row strips are too narrow for release rules.
    <TraceFrame height={height} marks={marks} phoneMarks={false} className={cn(waiting && 'border-dashed border-foreground/30', className)}>
      {downtimes
        .filter((period) => period.to > from)
        .map((period) => {
          const left = Math.max(0, (period.from - from) / width)
          const right = Math.min(1, (period.to - from) / width)
          return <span key={period.from} className={cn('absolute bottom-0 min-w-0.5', HEALTH[Health.down].bar)} style={{ left: `${left * 100}%`, width: `${(right - left) * 100}%`, height: Math.round(height * 0.8) }} />
        })}
    </TraceFrame>
  )
}

export function UptimeTabs({ org, current, counts }: { org: string; current: UptimeTab; counts: Partial<Record<UptimeTab, number>> }) {
  const tab = 'flex items-center gap-2 border-y-2 border-transparent text-sm font-medium whitespace-nowrap'
  const link = (value: UptimeTab, label: string, to: '/$org/uptime-monitors' | '/$org/uptime-monitors/status-pages') => (
    <Link to={to} params={{ org }} aria-current={current === value ? 'page' : undefined} className={cn(tab, current === value ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground')}>
      {label}
      {counts[value] !== undefined && <span className="mono text-muted-foreground">{counts[value]}</span>}
    </Link>
  )
  return (
    <nav aria-label="Uptime" className="flex h-full items-stretch gap-4">
      {link(UptimeTab.monitors, 'Monitors', '/$org/uptime-monitors')}
      {link(UptimeTab.statusPages, 'Status pages', '/$org/uptime-monitors/status-pages')}
    </nav>
  )
}
