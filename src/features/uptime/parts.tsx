import { Link } from '@tanstack/react-router'
import { Check as CheckIcon, Copy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Check } from '@/api/monitors'
import type { ReleaseMark } from '@/features/releases/marks'
import { cn } from '@/lib/utils'
import { HEALTH, UptimeTab } from './describe'
import { Health, isSlow, slowOver, type Downtime } from './health'

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
    <svg viewBox="0 0 10 10" className="size-3 shrink-0 text-destructive" role="img" aria-label={ongoing ? 'Down now' : 'Recovered'}>
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
    <div className={cn('relative flex items-end gap-px border-b border-grid', className)} style={{ height: height + 1 }} aria-hidden>
      {[...checks].reverse().map((check) => (
        <span
          key={check.startCheck}
          className={cn('min-w-0 flex-1', !check.isUp ? 'bg-destructive' : isSlow(check, timeout) ? 'bg-level-warning' : 'bg-foreground/45')}
          style={{ height: check.isUp ? Math.max(2, Math.round((Math.min(check.responseTime ?? 0, ceiling) / ceiling) * height)) : height }}
        />
      ))}
      {/* Drawn in the text colour with a paper edge, so it stays visible over slow (amber) bars. */}
      {line && toLimit && <span className="absolute inset-x-0 h-0.5 bg-foreground outline-1 outline-background" style={{ bottom: `calc(${(over / ceiling) * 100}% - 1px)` }} />}
    </div>
  )
}

// Release rules through a strip, in the quiet grid colour. A phone's row strips are too narrow for them.
export function ReleaseRules({ marks, phone = true }: { marks: ReleaseMark[]; phone?: boolean }) {
  return marks.map((mark) => <span key={mark.at} className={cn('absolute inset-y-0 w-px bg-grid', !phone && 'max-lg:hidden')} style={{ left: `${mark.at * 100}%` }} />)
}

// Release names placed over the time axis they belong to.
export function ReleaseLabels({ marks, className }: { marks: ReleaseMark[]; className?: string }) {
  return (
    <div className={cn('relative h-4', className)}>
      {marks.map((mark) => (
        <span
          key={mark.at}
          title={mark.title}
          className={cn('absolute top-0 font-mono text-xs leading-4 whitespace-nowrap text-muted-foreground', mark.at > 0.8 ? '-translate-x-full pr-1' : 'pl-1')}
          style={{ left: `${mark.at * 100}%` }}
        >
          {mark.label}
        </span>
      ))}
    </div>
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
  marks?: ReleaseMark[]
  waiting?: boolean
  height?: number
  className?: string
}) {
  const width = to - from
  return (
    <div className={cn('relative border-b border-grid', waiting && 'border-dashed border-foreground/30', className)} style={{ height: height + 1 }} aria-hidden>
      <ReleaseRules marks={marks} phone={false} />
      {downtimes
        .filter((period) => period.to > from)
        .map((period) => {
          const left = Math.max(0, (period.from - from) / width)
          const right = Math.min(1, (period.to - from) / width)
          return <span key={period.from} className="absolute bottom-0 min-w-0.5 bg-destructive" style={{ left: `${left * 100}%`, width: `${(right - left) * 100}%`, height: Math.round(height * 0.8) }} />
        })}
    </div>
  )
}

export function Section({ label, count, action, className, children }: { label: string; count?: number; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={className} aria-label={label}>
      <h2 className="label-caps flex h-9 items-center gap-2 border-b">
        {label}
        {count !== undefined && <span className="text-foreground">{count}</span>}
        {action && <span className="ml-auto tracking-normal normal-case">{action}</span>}
      </h2>
      {children}
    </section>
  )
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps truncate">{label}</dt>
      <dd className={cn('mono mt-1 text-xl leading-none font-semibold lg:text-2xl', tone)}>{value}</dd>
    </div>
  )
}

// "Uptime / Checkout API": where a page sits under its section.
export function Crumbs({ root, children }: { root: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
      {root}
      <span className="text-muted-foreground">/</span>
      <span className="truncate">{children}</span>
    </div>
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

const COPIED_FOR = 1500

// Machine text the user pastes elsewhere. It wraps, so all of it is on screen, and copies with one tap.
export function CopyField({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_FOR)
    })
  return (
    <div className={cn('flex items-stretch border bg-code', className)}>
      <code aria-label={label} className="mono min-w-0 flex-1 px-3 py-2 leading-normal [overflow-wrap:anywhere] max-lg:py-3">
        {value}
      </code>
      <button type="button" onClick={copy} className="flex shrink-0 cursor-pointer items-center gap-2 border-l bg-card px-3 text-sm font-medium -outline-offset-2 hover:bg-accent">
        {copied ? <CheckIcon className="size-4 text-ok" /> : <Copy className="size-4" />}
        <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  )
}
