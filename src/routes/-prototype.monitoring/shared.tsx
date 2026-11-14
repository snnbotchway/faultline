// PROTOTYPE, throwaway. Small parts the three variants share; each variant owns its layout.
import { useRouter, useRouterState } from '@tanstack/react-router'
import { BellRing, Mail, MessagesSquare, Webhook, type LucideIcon } from 'lucide-react'
import { useId, type ComponentProps, type MouseEvent, type ReactNode } from 'react'
import { dayLabel, hourLabel } from '@/features/issues/format'
import { cn } from '@/lib/utils'
import {
  MonitorType,
  NOW,
  Period,
  REASONS,
  RELEASES,
  RecipientType,
  State,
  incidents,
  stateOf,
  type Alert,
  type Check,
  type Monitor,
  type Recipient,
  type Span,
} from './data'

export const VARIANTS = [
  { key: 'a', name: 'Ledger' },
  { key: 'b', name: 'Console' },
  { key: 'c', name: 'Logbook' },
] as const
export type VariantKey = (typeof VARIANTS)[number]['key']

// Where the prototype is: the path under /:org, the search, and links that keep the variant.
export function useProto() {
  const location = useRouterState({ select: (state) => state.location })
  const router = useRouter()
  const [, org = '', ...path] = location.pathname.replace(/\/$/, '').split('/')
  const params = new URLSearchParams(location.searchStr)
  const variant = (VARIANTS.find((v) => v.key === params.get('variant'))?.key ?? 'a') as VariantKey
  const href = (to: string, search: Record<string, string | undefined> = {}) => {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(search)) if (value !== undefined) next.set(key, value)
    next.set('variant', variant)
    if (params.get('bar')) next.set('bar', params.get('bar')!)
    return `/${org}/${to}?${next}`
  }
  return { org, path: path.map(decodeURIComponent), params, variant, href, go: (to: string, search?: Record<string, string | undefined>) => router.history.push(href(to, search)) }
}

export function PLink({ to, search, className, children, ...props }: { to: string; search?: Record<string, string | undefined> } & Omit<ComponentProps<'a'>, 'href'>) {
  const { href } = useProto()
  const router = useRouter()
  const url = href(to, search)
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    router.history.push(url)
  }
  return (
    <a href={url} onClick={onClick} className={className} {...props}>
      {children}
    </a>
  )
}

const MIN = 60_000
export function span(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / MIN))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`
  return hours < 72 && hours % 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${Math.floor(hours / 24)}d`
}
export const responseText = (ms: number | null | undefined) => (ms == null ? '' : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`)
export const percent = (value: number | undefined) => (value === undefined ? '' : value === 1 ? '100%' : `${(Math.floor(value * 10000) / 100).toFixed(2)}%`)
export function every(seconds: number): string {
  if (seconds % 86400 === 0) return seconds === 86400 ? 'day' : `${seconds / 86400} days`
  if (seconds % 3600 === 0) return seconds === 3600 ? 'hour' : `${seconds / 3600} hours`
  if (seconds % 60 === 0) return seconds === 60 ? 'minute' : `${seconds / 60} min`
  return `${seconds} s`
}
const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
export const clockTime = (time: string | number) => clock.format(new Date(time))
const stamp = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
export const stampTime = (time: string | number) => stamp.format(new Date(time))
export const bytes = (size: number) => (size >= 1_000_000 ? `${(size / 1_000_000).toFixed(1)} MB` : `${Math.round(size / 1000)} kB`)

// "Down 14m · Wrong status", "Up 3d 2h", "No check yet".
export function stateLine(monitor: Monitor): string {
  const state = stateOf(monitor)
  if (state === State.waiting) return monitor.monitorType === MonitorType.heartbeat ? 'No heartbeat yet' : 'No check yet'
  const since = monitor.lastChange ? span(NOW - Date.parse(monitor.lastChange)) : ''
  if (state === State.up) return `Up ${since}`
  const reason = monitor.monitorType === MonitorType.heartbeat ? 'No heartbeat' : REASONS[incidents(monitor)[0]?.reason ?? 0]
  return `Down ${since} · ${reason}`
}

export const target = (monitor: Monitor) => (monitor.monitorType === MonitorType.heartbeat ? `every ${every(monitor.interval)}` : (monitor.url ?? '').replace(/^https?:\/\//, ''))

const STATE_COLOR: Record<State, string> = { [State.down]: 'text-destructive', [State.up]: 'text-ok', [State.waiting]: 'text-muted-foreground' }
const STATE_LABEL: Record<State, string> = { [State.down]: 'Down', [State.up]: 'Up', [State.waiting]: 'Waiting' }

// State by shape as well as colour: a square is down, a disc is up, a ring has not reported yet.
export function StateGlyph({ state, className }: { state: State; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" role="img" aria-label={STATE_LABEL[state]} className={cn('size-2.5 shrink-0', STATE_COLOR[state], className)}>
      {state === State.down ? (
        <rect width="10" height="10" fill="currentColor" />
      ) : state === State.up ? (
        <circle cx="5" cy="5" r="4.5" fill="currentColor" />
      ) : (
        <circle cx="5" cy="5" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      )}
    </svg>
  )
}

export type Mark = { at: number; label: string }
export const releaseMarksIn = (range: Span): Mark[] =>
  RELEASES.map((release) => ({ at: (Date.parse(release.dateCreated) - range.from) / (range.to - range.from), label: release.shortVersion.length > 8 ? `${release.shortVersion.slice(0, 7)}…` : release.shortVersion }))
    .filter((mark) => mark.at >= 0 && mark.at <= 1)
    .sort((a, b) => a.at - b.at)
    .filter((mark, index, all) => index === 0 || mark.at - all[index - 1]!.at > 0.16)

// Down periods on the shared time axis: a baseline that is always there, and a block for every stretch of downtime.
export function Band({ monitor, range, marks = [], height = 22, className }: { monitor: Monitor; range: Span; marks?: Mark[]; height?: number; className?: string }) {
  const width = range.to - range.from
  const waiting = monitor.isUp === null
  return (
    <div className={cn('relative border-b', waiting ? 'border-dashed border-foreground/30' : 'border-foreground/30', className)} style={{ height: height + 1 }} aria-hidden>
      {marks.map((mark) => (
        <span key={mark.at} className="absolute inset-y-0 w-px bg-brand/45" style={{ left: `${mark.at * 100}%` }} />
      ))}
      {incidents(monitor)
        .filter((outage) => outage.to > range.from)
        .map((outage) => {
          const left = Math.max(0, (outage.from - range.from) / width)
          const right = Math.min(1, (outage.to - range.from) / width)
          return <span key={outage.from} className="absolute bottom-0 min-w-[2px] bg-destructive" style={{ left: `${left * 100}%`, width: `${(right - left) * 100}%`, height: Math.round(height * 0.7) }} />
        })}
    </div>
  )
}

export function AxisEnds({ period, className }: { period: Period; className?: string }) {
  const from = NOW - (period === Period.day ? 24 * 60 * MIN : 14 * 24 * 60 * MIN)
  return (
    <span className={cn('label-caps flex justify-between', className)}>
      <span>{period === Period.day ? hourLabel(from / 1000) : dayLabel(from / 1000)}</span>
      <span>Downtime</span>
      <span>Now</span>
    </span>
  )
}

export function MarkLabels({ marks, className }: { marks: Mark[]; className?: string }) {
  return (
    <div className={cn('relative h-5', className)}>
      {marks.map((mark) => (
        <span key={mark.at} className={cn('absolute top-0 font-mono text-xs whitespace-nowrap text-brand', mark.at > 0.8 ? '-translate-x-full pr-1' : 'pl-1')} style={{ left: `${mark.at * 100}%` }}>
          {mark.label}
        </span>
      ))}
    </div>
  )
}

// One bar per check, oldest first. Against the timeout, a bar that reaches the top took the whole allowance;
// without one the bars are scaled to their own peak. A failed check is a full-height bar.
export function ResponseBars({ checks, timeout, height, className }: { checks: Check[]; timeout?: number | null; height: number; className?: string }) {
  const ceiling = timeout ? timeout * 1000 : Math.max(1, ...checks.filter((check) => check.isUp).map((check) => check.responseTime ?? 0))
  return (
    <div className={cn('relative flex items-end gap-px border-b border-foreground/30', className)} style={{ height: height + 1 }} aria-hidden>
      {[...checks].reverse().map((check) => (
        <span
          key={check.startCheck}
          className={cn('min-w-0 flex-1', check.isUp ? 'bg-foreground/50' : 'bg-destructive')}
          style={{ height: check.isUp ? Math.max(2, Math.round((Math.min(check.responseTime ?? 0, ceiling) / ceiling) * height)) : height }}
        />
      ))}
    </div>
  )
}

// Plain bars for counts, as on the inbox.
export function Bars({ values, height, className, marks = [] }: { values: number[]; height: number; className?: string; marks?: Mark[] }) {
  const peak = Math.max(...values, 1)
  return (
    <div className={cn('relative flex items-end gap-px border-b border-foreground/30', className)} style={{ height: height + 1 }} aria-hidden>
      {marks.map((mark) => (
        <span key={mark.at} className="absolute inset-y-0 w-px bg-brand/45" style={{ left: `${mark.at * 100}%` }} />
      ))}
      {values.map((value, index) => (
        <span key={index} className="min-w-0 flex-1 bg-foreground/50" style={{ height: value ? Math.max(2, Math.round((value / peak) * height)) : 0 }} />
      ))}
    </div>
  )
}

export function Field({ label, className, children }: { label: string; className?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
    </div>
  )
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn('h-9 w-full min-w-0 cursor-pointer border bg-card px-2 text-base outline-none focus-visible:border-brand focus-visible:outline-none max-lg:h-11 max-lg:text-[1rem]', className)}
      {...props}
    />
  )
}

export function Segmented<T extends string>({ value, options, onChange, label, className }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex border bg-card', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-[26px] flex-auto border-r px-2.5 text-sm font-medium whitespace-nowrap last:border-r-0 max-lg:h-[42px]',
            option.value === value ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export const TYPE_OPTIONS = [
  { value: MonitorType.get, label: 'GET' },
  { value: MonitorType.post, label: 'POST' },
  { value: MonitorType.ping, label: 'Ping' },
  { value: MonitorType.port, label: 'Port' },
  { value: MonitorType.heartbeat, label: 'Heartbeat' },
]
export const INTERVALS = [60, 120, 300, 900, 3600, 86400]
export const isHttp = (type: string) => type === MonitorType.get || type === MonitorType.post
export const targetLabel = (type: string) => (type === MonitorType.port ? 'Host and port' : type === MonitorType.ping ? 'Host' : 'URL')
export const targetPlaceholder = (type: string) => (type === MonitorType.port ? 'db.example.com:5432' : type === MonitorType.ping ? 'example.com' : 'https://example.com/health')

export type Draft = { name: string; type: MonitorType; url: string; status: string; body: string; interval: number; timeout: string; threshold: string; project: string; env: string }
export const draftFrom = (monitor?: Monitor): Draft => ({
  name: monitor?.name ?? '',
  type: (monitor?.monitorType as MonitorType | undefined) ?? MonitorType.get,
  url: monitor?.url ?? '',
  status: String(monitor?.expectedStatus ?? 200),
  body: monitor?.expectedBody ?? '',
  interval: monitor?.interval ?? 60,
  timeout: String(monitor?.timeout ?? 20),
  threshold: String(monitor?.confirmationThreshold ?? 1),
  project: monitor?.projectName ?? '',
  env: monitor?.envName ?? '',
})

export const RECIPIENTS: Record<RecipientType, { label: string; icon: LucideIcon; placeholder: string }> = {
  [RecipientType.email]: { label: 'Email', icon: Mail, placeholder: '' },
  [RecipientType.webhook]: { label: 'Webhook', icon: Webhook, placeholder: 'https://example.com/hooks/alerts' },
  [RecipientType.slack]: { label: 'Slack', icon: MessagesSquare, placeholder: 'https://hooks.slack.com/services/…' },
  [RecipientType.discord]: { label: 'Discord', icon: MessagesSquare, placeholder: 'https://discord.com/api/webhooks/…' },
  [RecipientType.teams]: { label: 'Teams', icon: MessagesSquare, placeholder: 'https://…webhook.office.com/…' },
  [RecipientType.googlechat]: { label: 'Google Chat', icon: MessagesSquare, placeholder: 'https://chat.googleapis.com/v1/spaces/…' },
  [RecipientType.ntfy]: { label: 'ntfy', icon: BellRing, placeholder: 'https://ntfy.sh/your-topic' },
  [RecipientType.feishu]: { label: 'Feishu', icon: MessagesSquare, placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/…' },
  [RecipientType.zulip]: { label: 'Zulip', icon: MessagesSquare, placeholder: 'https://example.zulipchat.com' },
}
export const recipientMeta = (recipient: Pick<Recipient, 'recipientType'>) => RECIPIENTS[recipient.recipientType as RecipientType] ?? RECIPIENTS.webhook
// The part of a webhook address that tells two apart: the host and the last path segment.
export function recipientTarget(recipient: Recipient): string {
  if (recipient.recipientType === RecipientType.email) return 'project members'
  try {
    const url = new URL(recipient.url ?? '')
    return `${url.host.replace(/^www\./, '')}/…/${url.pathname.split('/').filter(Boolean).at(-1) ?? ''}`
  } catch {
    return recipient.url ?? ''
  }
}

export function RecipientChip({ recipient, className }: { recipient: Recipient; className?: string }) {
  const meta = recipientMeta(recipient)
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-sm', className)} title={recipient.url || undefined}>
      <meta.icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{meta.label}</span>
    </span>
  )
}

// "10 events in 5 min", "a monitor goes down", or both.
export function conditions(alert: Pick<Alert, 'quantity' | 'timespanMinutes' | 'uptime'>): string[] {
  const parts: string[] = []
  if (alert.quantity && alert.timespanMinutes) parts.push(`${alert.quantity} ${alert.quantity === 1 ? 'event' : 'events'} in ${alert.timespanMinutes} min`)
  if (alert.uptime) parts.push('a monitor goes down')
  return parts
}

export function Section({ label, count, action, className, children }: { label: string; count?: number; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={className}>
      <h2 className="label-caps flex h-9 items-center gap-2 border-b">
        {label}
        {count !== undefined && <span className="text-foreground">{count}</span>}
        {action && <span className="ml-auto tracking-normal normal-case">{action}</span>}
      </h2>
      {children}
    </section>
  )
}

export function Stat({ label, value, tone, className }: { label: string; value: ReactNode; tone?: string; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="label-caps truncate">{label}</dt>
      <dd className={cn('mono mt-1 text-[1.125rem] leading-none font-semibold lg:text-[1.375rem]', tone)}>{value}</dd>
    </div>
  )
}

export function Tabs({ tabs, current, to, className }: { tabs: { key: string; label: string; count?: number }[]; current: string; to: (key: string) => { to: string; search?: Record<string, string | undefined> }; className?: string }) {
  return (
    <nav className={cn('flex h-full items-stretch gap-4', className)}>
      {tabs.map((tab) => (
        <PLink
          key={tab.key}
          {...to(tab.key)}
          aria-current={tab.key === current ? 'page' : undefined}
          className={cn('flex items-center gap-1.5 border-y-2 border-transparent text-sm font-medium whitespace-nowrap', tab.key === current ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground')}
        >
          {tab.label}
          {tab.count !== undefined && <span className="mono text-muted-foreground">{tab.count}</span>}
        </PLink>
      ))}
    </nav>
  )
}
