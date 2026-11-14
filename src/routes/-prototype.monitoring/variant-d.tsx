// PROTOTYPE, throwaway. Variant D, "Mix": the picker's choice from A, B and C, with the review defects fixed.
// Uptime list from A, monitor page from C, monitor form from B in a dialog, alert rules from A with
// C's recipient chips, releases from C.
//
// Every number on these screens comes from something the backend returns: the newest 60 checks of a
// monitor, and its state-change checks (when it went down and came back). There is no uptime percentage.
import { ChevronDown, ExternalLink, Globe, HeartPulse, Lock, Plug, Radio, Send, X, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ago, dayLabel, exact } from '@/features/issues/format'
import { notify } from '@/lib/notice'
import { cn } from '@/lib/utils'
import {
  ALERTS,
  ENVIRONMENTS,
  Health,
  MONITORS,
  MonitorType,
  NOW,
  ORG_EVENTS,
  PROJECTS,
  Period,
  REASONS,
  RELEASES,
  RecipientType,
  STATUS_PAGES,
  flapping,
  healthOf,
  incidents,
  isSlow,
  monitorById,
  releaseDeploys,
  releaseIssues,
  responseNow,
  slowOver,
  spanFor,
  type Alert,
  type Check,
  type Monitor,
  type Recipient,
  type Release,
  type Span,
} from './data'
import type { ScreenProps } from './index'
import {
  AxisEnds,
  Band,
  Field,
  INTERVALS,
  PLink,
  RecipientChip,
  Section,
  Segmented,
  Select,
  Stat,
  Tabs,
  clockTime,
  conditions,
  draftFrom,
  every,
  isHttp,
  recipientMeta,
  recipientTarget,
  responseText,
  span,
  stampTime,
  target,
  targetLabel,
  targetPlaceholder,
  useProto,
  type Draft,
  type Mark,
} from './shared'
import { NewStatusPage } from './variant-a'
import { AddRecipient, ReleasePage } from './variant-c'

const saved = () => notify('Prototype: nothing was saved')
const now = new Date(NOW)
const DAY = 86_400_000

export function VariantD(props: ScreenProps) {
  const { go } = useProto()
  switch (props.screen) {
    case 'uptime':
      return <UptimeList />
    case 'monitor':
      return <MonitorPage monitor={props.monitor} />
    case 'monitor-form':
      return (
        <>
          {props.monitor ? <MonitorPage monitor={props.monitor} /> : <UptimeList />}
          <MonitorDialog monitor={props.monitor} onClose={() => go(props.monitor ? `uptime-monitors/${props.monitor.id}` : 'uptime-monitors')} />
        </>
      )
    case 'status-pages':
      return <StatusPages />
    case 'alerts':
      return <Alerts {...props} />
    case 'releases':
      return <Releases />
    case 'release':
      return <ReleasePage release={props.release} />
  }
}

const HEALTH: Record<Health, { label: string; color: string }> = {
  [Health.down]: { label: 'Down', color: 'text-destructive' },
  [Health.flapping]: { label: 'Flapping', color: 'text-trend-spiking' },
  [Health.slow]: { label: 'Slow', color: 'text-level-warning' },
  [Health.up]: { label: 'Up', color: 'text-ok' },
  [Health.waiting]: { label: 'Waiting', color: 'text-muted-foreground' },
}

// Health by shape as well as colour: square down, diamond flapping, triangle slow, disc up, ring not reported yet.
function HealthGlyph({ health, className }: { health: Health; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" role="img" aria-label={HEALTH[health].label} className={cn('size-2.5 shrink-0', HEALTH[health].color, className)}>
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

const since = (monitor: Monitor) => (monitor.lastChange ? span(NOW - Date.parse(monitor.lastChange)) : '')

// One line that says what the health means for this monitor, with the time it started.
function healthLine(monitor: Monitor): string {
  const heartbeat = monitor.monitorType === MonitorType.heartbeat
  switch (healthOf(monitor)) {
    case Health.waiting:
      return heartbeat ? 'No heartbeat yet' : 'No check yet'
    case Health.down:
      return `Down ${since(monitor)} · ${heartbeat ? 'No heartbeat' : REASONS[incidents(monitor)[0]?.reason ?? 0]}`
    case Health.flapping: {
      const { count, since: first } = flapping(monitor)!
      return `Down ${count} times since ${clockTime(first)}`
    }
    case Health.slow:
      return `${responseText(responseNow(monitor))} of a ${monitor.timeout}s limit`
    case Health.up:
      return `Up ${since(monitor)}`
  }
}

const slowTooText = (monitor: Monitor) => {
  const typical = responseNow(monitor)
  const over = slowOver(monitor)
  return healthOf(monitor) === Health.flapping && typical !== undefined && over !== undefined && typical > over
}

// One bar per check, oldest first: grey passed, amber passed but slow, red failed.
// Scaled to the timeout when any check was slow, so the slow line means something; otherwise to the peak.
function CheckBars({ monitor, checks = monitor.checks, height, line = false, className }: { monitor: Monitor; checks?: Check[]; height: number; line?: boolean; className?: string }) {
  const over = slowOver(monitor)
  const peak = Math.max(1, ...checks.filter((check) => check.isUp).map((check) => check.responseTime ?? 0))
  const toLimit = over !== undefined && peak > over
  const ceiling = toLimit ? (monitor.timeout ?? 20) * 1000 : peak
  return (
    <div className={cn('relative flex items-end gap-px border-b border-foreground/30', className)} style={{ height: height + 1 }} aria-hidden>
      {[...checks].reverse().map((check) => (
        <span
          key={check.startCheck}
          className={cn('min-w-0 flex-1', !check.isUp ? 'bg-destructive' : isSlow(check, monitor) ? 'bg-level-warning' : 'bg-foreground/45')}
          style={{ height: check.isUp ? Math.max(2, Math.round((Math.min(check.responseTime ?? 0, ceiling) / ceiling) * height)) : height }}
        />
      ))}
      {line && toLimit && <span className="absolute inset-x-0 border-t border-dashed border-foreground" style={{ bottom: `${(over / ceiling) * 100}%` }} />}
    </div>
  )
}

// Every release inside the range gets a rule. Labels that would run into each other drop to a second row.
function marksIn(range: Span): (Mark & { row: number })[] {
  const lastAt = [-1, -1]
  return RELEASES.map((release) => ({ at: (Date.parse(release.dateCreated) - range.from) / (range.to - range.from), label: release.shortVersion.length > 8 ? `${release.shortVersion.slice(0, 7)}…` : release.shortVersion }))
    .filter((mark) => mark.at >= 0 && mark.at <= 1)
    .sort((a, b) => a.at - b.at)
    .map((mark) => {
      const row = mark.at - lastAt[0]! > 0.2 ? 0 : 1
      lastAt[row] = mark.at
      return { ...mark, row }
    })
}

function MarkRows({ marks, className }: { marks: (Mark & { row: number })[]; className?: string }) {
  return (
    <div className={cn('relative h-9', className)}>
      {marks.map((mark) => (
        <span
          key={mark.at}
          className={cn('absolute font-mono text-xs whitespace-nowrap text-brand', mark.row ? 'top-0' : 'top-[18px]', mark.at > 0.85 ? '-translate-x-full pr-1' : 'pl-1')}
          style={{ left: `${mark.at * 100}%` }}
        >
          {mark.label}
        </span>
      ))}
      {marks
        .filter((mark) => mark.row)
        .map((mark) => (
          <span key={mark.at} className="absolute top-0 bottom-0 w-px bg-brand/45" style={{ left: `${mark.at * 100}%` }} />
        ))}
    </div>
  )
}

const UPTIME_TABS = [
  { key: 'uptime-monitors', label: 'Monitors', count: MONITORS.length },
  { key: 'uptime-monitors/status-pages', label: 'Status pages', count: STATUS_PAGES.length },
]

const COLUMNS = 'lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_232px_80px]'
const GROUPS = [Health.down, Health.flapping, Health.slow, Health.up, Health.waiting]
const GROUP_LABEL: Record<Health, string> = { ...Object.fromEntries(Object.entries(HEALTH).map(([key, value]) => [key, value.label])), [Health.waiting]: 'Waiting for a first check' } as Record<Health, string>

function UptimeList() {
  const { params, go } = useProto()
  const period = params.get('period') === Period.fortnight ? Period.fortnight : Period.day
  const range = spanFor(period)
  const marks = marksIn(range)
  const count = (health: Health) => MONITORS.filter((monitor) => healthOf(monitor) === health).length
  return (
    <>
      <PageBar>
        <Tabs tabs={UPTIME_TABS} current="uptime-monitors" to={(key) => ({ to: key })} />
        <div className="ml-auto flex items-center gap-2">
          <Segmented
            label="Period"
            value={period}
            options={[
              { value: Period.day, label: '24h' },
              { value: Period.fortnight, label: '14d' },
            ]}
            onChange={(value) => go('uptime-monitors', { period: value })}
            className="max-lg:hidden"
          />
          <Button asChild variant="default" size="sm" className="max-lg:h-9">
            <PLink to="uptime-monitors/new">New monitor</PLink>
          </Button>
        </div>
      </PageBar>

      <div className={cn('grid items-end border-b px-3 py-3 lg:px-4', COLUMNS)}>
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span>
            <span className="mono text-[1.375rem] leading-none font-semibold lg:text-[1.625rem]">{MONITORS.length}</span> monitors
          </span>
          {[Health.down, Health.flapping, Health.slow]
            .filter((health) => count(health) > 0)
            .map((health) => (
              <span key={health} className={HEALTH[health].color}>
                <span className="mono font-semibold">{count(health)}</span> {HEALTH[health].label.toLowerCase()}
              </span>
            ))}
          {count(Health.down) + count(Health.flapping) + count(Health.slow) === 0 && <span className="text-ok">all up</span>}
        </p>
        <MarkRows marks={marks} className="max-lg:hidden lg:mx-4" />
      </div>
      <div className={cn('sticky top-11 z-10 grid h-8 items-center border-b bg-background px-4 max-lg:hidden', COLUMNS)}>
        <span className="label-caps">Monitor</span>
        <AxisEnds period={period} className="mx-4" />
        <span className="label-caps text-right">Last 60 checks</span>
        <span className="label-caps text-right">Changed</span>
      </div>

      {GROUPS.map((health) => {
        const rows = MONITORS.filter((monitor) => healthOf(monitor) === health)
        if (!rows.length) return null
        const loud = health === Health.down || health === Health.flapping || health === Health.slow
        return (
          <section key={health} aria-label={GROUP_LABEL[health]}>
            <h2 className={cn('label-caps flex h-8 items-center gap-2 border-b bg-muted/60 px-3 font-semibold lg:px-4', loud && HEALTH[health].color)}>
              {GROUP_LABEL[health]}
              <span className="font-normal text-muted-foreground">{rows.length}</span>
            </h2>
            <ul>
              {rows.map((monitor) => {
                const typical = responseNow(monitor)
                const slow = health === Health.slow || slowTooText(monitor)
                return (
                  <li key={monitor.id} className="border-b">
                    <PLink
                      to={`uptime-monitors/${monitor.id}`}
                      className={cn('grid grid-cols-[minmax(0,1fr)_96px] items-center gap-x-3 px-3 py-2.5 transition-colors duration-100 hover:bg-accent/60 lg:gap-x-0 lg:px-4 lg:py-2', COLUMNS)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <HealthGlyph health={health} />
                          <span className="truncate font-medium">{monitor.name}</span>
                          {slowTooText(monitor) && <span className="label-caps shrink-0 text-level-warning">Slow</span>}
                        </div>
                        <div className="mono mt-0.5 flex gap-2 pl-[18px] text-muted-foreground">
                          {loud && <span className={cn('shrink-0 max-lg:hidden', HEALTH[health].color)}>{health === Health.down ? healthLine(monitor).split(' · ')[1] : healthLine(monitor)}</span>}
                          <span className="truncate max-lg:hidden">{target(monitor)}</span>
                          <span className={cn('truncate lg:hidden', loud && HEALTH[health].color)}>
                            {healthLine(monitor)}
                            {health === Health.up && typical !== undefined && ` · ${responseText(typical)}`}
                          </span>
                        </div>
                      </div>
                      <Band monitor={monitor} range={range} marks={marks} className="lg:mx-4" />
                      <span className="flex items-center justify-end gap-3 max-lg:hidden">
                        {monitor.monitorType !== MonitorType.heartbeat && monitor.checks.length > 0 && <CheckBars monitor={monitor} height={18} className="w-[119px]" />}
                        <span className={cn('mono w-14 text-right', slow && 'font-semibold text-level-warning')}>{responseText(typical)}</span>
                      </span>
                      <time className="mono text-right text-muted-foreground max-lg:hidden" title={monitor.lastChange ? exact(monitor.lastChange) : undefined}>
                        {monitor.lastChange && monitor.isUp !== null ? ago(monitor.lastChange, now) : ''}
                      </time>
                    </PLink>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </>
  )
}

function Crumbs({ root, rootTo, children }: { root: string; rootTo: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <PLink to={rootTo} className="shrink-0 text-sm font-medium text-muted-foreground hover:text-foreground">
        {root}
      </PLink>
      <span className="text-muted-foreground">/</span>
      <span className="truncate text-sm font-medium">{children}</span>
    </div>
  )
}

function OutageGlyph({ ongoing }: { ongoing: boolean }) {
  return (
    <svg viewBox="0 0 10 10" className="size-2.5 shrink-0 text-destructive" role="img" aria-label={ongoing ? 'Down now' : 'Recovered'}>
      {ongoing ? <rect width="10" height="10" fill="currentColor" /> : <rect x="0.75" y="0.75" width="8.5" height="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  )
}

const HEADLINE: Record<Health, string> = {
  [Health.down]: 'is down',
  [Health.flapping]: 'is flapping',
  [Health.slow]: 'is slow',
  [Health.up]: 'is up',
  [Health.waiting]: 'has not reported yet',
}

function MonitorPage({ monitor }: { monitor: Monitor }) {
  const [unfolded, setUnfolded] = useState<number | undefined>(() => incidents(monitor).find((outage) => outage.ongoing)?.from)
  const [allChecks, setAllChecks] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { go } = useProto()
  const health = healthOf(monitor)
  const heartbeat = monitor.monitorType === MonitorType.heartbeat
  const outages = incidents(monitor)
  const rules = ALERTS.filter((alert) => alert.project === monitor.projectName && alert.uptime)
  const to = `uptime-monitors/${monitor.id}`
  const checked = monitor.checks.length
  const passed = monitor.checks.filter((check) => check.isUp).length
  const slowChecks = monitor.checks.filter((check) => isSlow(check, monitor)).length
  const peak = Math.max(0, ...monitor.checks.filter((check) => check.isUp).map((check) => check.responseTime ?? 0))
  const over = slowOver(monitor)
  const loud = health === Health.down || health === Health.flapping || health === Health.slow
  const facts: [string, string | null | undefined][] = [
    ['Check', monitor.monitorType],
    ['Status', isHttp(monitor.monitorType) ? String(monitor.expectedStatus ?? '') : null],
    ['Text', monitor.expectedBody || null],
    ['Timeout', monitor.timeout ? `${monitor.timeout}s` : null],
    ['Down after', `${monitor.confirmationThreshold} failed`],
    ['Project', monitor.projectName],
    ['Environment', monitor.envName],
  ]
  return (
    <>
      <PageBar>
        <Crumbs root="Uptime" rootTo="uptime-monitors">
          {monitor.name}
        </Crumbs>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button asChild size="sm" className="max-lg:h-9">
            <PLink to={`${to}/update`}>Edit</PLink>
          </Button>
          <Button size="sm" variant="destructive" className="max-lg:h-9" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        </div>
      </PageBar>

      {/* On a phone the two columns dissolve into one, ordered: title, stats and chart, downtime, checks, setup, alerts. */}
      <div className="mx-auto flex w-full max-w-6xl flex-col px-3 pb-16 md:px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-x-10">
        <div className="contents lg:block lg:min-w-0">
          <header className="order-1 py-5">
            <h1 className={cn('flex items-center gap-3 text-2xl font-semibold', loud && HEALTH[health].color)}>
              <HealthGlyph health={health} className="size-3.5" />
              <span>
                {monitor.name} {HEADLINE[health]}
              </span>
            </h1>
            {health !== Health.waiting && <p className="mt-1 font-medium">{healthLine(monitor)}</p>}
            <p className="mono mt-2 [overflow-wrap:anywhere] text-muted-foreground">{heartbeat ? `a heartbeat every ${every(monitor.interval)}` : `${monitor.monitorType} ${monitor.url} every ${every(monitor.interval)}`}</p>
          </header>

          <div className="order-3">
            <Section label="Downtime" count={outages.length}>
              {outages.length === 0 && <p className="py-4 text-muted-foreground">{health === Health.waiting ? 'Nothing to show until the first check.' : 'No downtime recorded.'}</p>}
              <ul>
                {outages.map((outage) => {
                  const open = unfolded === outage.from
                  const before = RELEASES.find((release) => Date.parse(release.dateCreated) < outage.from)
                  return (
                    <li key={outage.from} className="border-b">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setUnfolded(open ? undefined : outage.from)}
                        className={cn('grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-x-3 py-2 text-left lg:grid-cols-[132px_minmax(0,1fr)_auto_20px]', open ? 'bg-accent' : 'hover:bg-accent/60')}
                      >
                        <time className="mono text-muted-foreground max-lg:col-span-3">{stampTime(outage.from)}</time>
                        <span className="flex min-w-0 items-center gap-2">
                          <OutageGlyph ongoing={outage.ongoing} />
                          <span className="truncate">{heartbeat ? 'No heartbeat' : REASONS[outage.reason]}</span>
                        </span>
                        <span className={cn('mono', outage.ongoing && 'font-semibold text-destructive')}>
                          {span(outage.to - outage.from)}
                          {outage.ongoing && ' so far'}
                        </span>
                        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
                      </button>
                      {open && (
                        <dl className="border-t bg-card px-3 py-2 lg:pl-[144px]">
                          {[
                            ['Went down', stampTime(outage.from)],
                            ['Came back', outage.ongoing ? 'not yet' : stampTime(outage.to)],
                            ['Release before', before ? `${before.shortVersion}, ${span(outage.from - Date.parse(before.dateCreated))} earlier` : 'none'],
                            ['Notified', rules.length ? [...new Set(rules.flatMap((rule) => rule.alertRecipients.map((recipient) => recipientMeta(recipient).label)))].join(', ') : 'nobody'],
                          ].map(([label, value]) => (
                            <div key={label} className="flex min-h-8 items-center justify-between gap-4">
                              <dt className="shrink-0 text-muted-foreground">{label}</dt>
                              <dd className="mono truncate">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Section>

            <Section label="Latest checks" className="mt-7">
              <ul>
                {monitor.checks.slice(0, allChecks ? undefined : 8).map((check) => {
                  const slow = isSlow(check, monitor)
                  return (
                    <li key={check.startCheck} className="grid min-h-9 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_64px] items-center gap-3 border-b lg:grid-cols-[132px_minmax(0,1fr)_72px]">
                      <time className="mono text-muted-foreground">{stampTime(check.startCheck)}</time>
                      <span className="flex items-center gap-2">
                        <HealthGlyph health={!check.isUp ? Health.down : slow ? Health.slow : Health.up} />
                        <span className={cn('truncate', !check.isUp ? 'text-destructive' : slow && 'text-level-warning')}>{!check.isUp ? REASONS[check.reason ?? 0] : slow ? 'Slow' : 'Up'}</span>
                      </span>
                      <span className={cn('mono text-right', slow && 'font-semibold text-level-warning')}>{responseText(check.responseTime)}</span>
                    </li>
                  )
                })}
              </ul>
              {checked === 0 && <p className="py-4 text-muted-foreground">No checks yet.</p>}
              {!allChecks && checked > 8 && (
                <Button size="sm" className="mt-3 max-lg:h-11" onClick={() => setAllChecks(true)}>
                  All {checked} checks
                </Button>
              )}
            </Section>
          </div>
        </div>

        <aside className="contents lg:flex lg:flex-col lg:gap-7 lg:border-l lg:pt-5 lg:pl-6">
          <div className="order-2 pb-7 lg:pb-0">
            <Section label={checked ? `Last ${checked} checks` : 'Checks'}>
              {checked === 0 ? (
                <p className="py-3 text-muted-foreground">None yet.</p>
              ) : (
                <>
                  <dl className="grid grid-cols-3 gap-x-4 pt-3">
                    <Stat label="Passed" value={`${passed}/${checked}`} tone={passed < checked ? 'text-destructive' : undefined} />
                    {!heartbeat && <Stat label="Response" value={responseText(responseNow(monitor)) || 'none'} tone={health === Health.slow || slowTooText(monitor) ? 'text-level-warning' : undefined} />}
                    {!heartbeat && <Stat label="Slow" value={slowChecks} tone={slowChecks ? 'text-level-warning' : undefined} />}
                  </dl>
                  {!heartbeat && (
                    <>
                      <CheckBars monitor={monitor} height={64} line className="mt-4" />
                      <p className="mono mt-1.5 flex justify-between text-muted-foreground">
                        <span>{clockTime(monitor.checks.at(-1)!.startCheck)}</span>
                        <span>
                          peak {responseText(peak)}
                          {over !== undefined && ` · slow over ${responseText(over)}`}
                        </span>
                        <span>Now</span>
                      </p>
                    </>
                  )}
                </>
              )}
            </Section>
          </div>
          <div className="order-4 mt-7 flex flex-col gap-7 lg:mt-0">
            {heartbeat && (
              <Section label="Heartbeat address" action={<Button size="sm" onClick={() => notify('Copied')}>Copy</Button>}>
                <p className="mono mt-3 overflow-x-auto border bg-code px-3 py-2.5 whitespace-nowrap">{monitor.heartbeatEndpoint}</p>
              </Section>
            )}
            <Section label="Setup">
              <dl>
                {facts
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className="flex min-h-9 items-center justify-between gap-4 border-b">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="mono truncate">{value}</dd>
                    </div>
                  ))}
              </dl>
            </Section>
            <Section label="Alerts" count={rules.length}>
              <ul>
                {rules.map((rule) => (
                  <li key={rule.id} className="border-b">
                    <PLink to="alerts" search={{ alert: String(rule.id), project: rule.project }} className="block py-2 hover:bg-accent/60">
                      <span className="block font-medium">{rule.name}</span>
                      <span className="block text-sm text-muted-foreground">{rule.alertRecipients.map((recipient) => recipientMeta(recipient).label).join(', ')}</span>
                    </PLink>
                  </li>
                ))}
              </ul>
              {rules.length === 0 && (
                <p className="py-3 text-muted-foreground">
                  Nobody is told when this goes down.{' '}
                  <PLink to={monitor.projectName ? 'alerts' : `${to}/update`} search={monitor.projectName ? { alert: 'new', project: monitor.projectName } : undefined} className="text-brand hover:underline">
                    {monitor.projectName ? 'Add a rule' : 'Link a project'}
                  </PLink>
                </p>
              )}
            </Section>
          </div>
        </aside>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent aria-describedby={undefined} className="p-4">
          <DialogTitle>Delete {monitor.name}?</DialogTitle>
          <p className="mt-2 text-muted-foreground">Its check history is deleted with it.</p>
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                saved()
                go('uptime-monitors')
              }}
            >
              Delete monitor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

const TYPE_TILES: { value: MonitorType; label: string; icon: LucideIcon }[] = [
  { value: MonitorType.get, label: 'GET', icon: Globe },
  { value: MonitorType.post, label: 'POST', icon: Send },
  { value: MonitorType.ping, label: 'Ping', icon: Radio },
  { value: MonitorType.port, label: 'Port', icon: Plug },
  { value: MonitorType.heartbeat, label: 'Heartbeat', icon: HeartPulse },
]

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="grid gap-x-5 gap-y-3 border-b py-4 last:border-b-0 sm:grid-cols-[96px_minmax(0,1fr)]">
      <span className="label-caps sm:pt-1">{label}</span>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </div>
  )
}

function MonitorDialog({ monitor, onClose }: { monitor?: Monitor; onClose: () => void }) {
  const { params } = useProto()
  const [draft, setDraft] = useState<Draft>(() => ({ ...draftFrom(monitor), ...(TYPE_TILES.some((tile) => tile.value === params.get('type')) && { type: params.get('type') as MonitorType }) }))
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const heartbeat = draft.type === MonitorType.heartbeat
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined} onOpenAutoFocus={(event) => event.preventDefault()} className="top-[4vh] flex max-h-[92vh] max-w-2xl flex-col">
        <div className="flex h-11 shrink-0 items-center justify-between border-b pr-1.5 pl-4">
          <DialogTitle className="text-base">{monitor ? `Edit ${monitor.name}` : 'New monitor'}</DialogTitle>
          <DialogClose aria-label="Close" className="grid size-8 place-items-center hover:bg-accent max-lg:size-11">
            <X className="size-4" />
          </DialogClose>
        </div>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            saved()
            onClose()
          }}
        >
          <div className="min-h-0 overflow-y-auto px-4">
            <Group label="Check">
              <div role="radiogroup" aria-label="Type" className="grid grid-cols-5 border bg-card">
                {TYPE_TILES.map((tile) => (
                  <button
                    key={tile.value}
                    type="button"
                    role="radio"
                    aria-checked={draft.type === tile.value}
                    onClick={() => set('type', tile.value)}
                    className={cn(
                      'flex h-14 min-w-0 flex-col items-center justify-center gap-1 border-r text-sm font-medium last:border-r-0',
                      draft.type === tile.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <tile.icon className="size-4" strokeWidth={1.8} />
                    {tile.label}
                  </button>
                ))}
              </div>
              {heartbeat ? (
                <Field label="Address to call">
                  {(id) =>
                    monitor?.heartbeatEndpoint ? (
                      <div className="flex gap-2">
                        <Input id={id} readOnly className="font-mono" value={monitor.heartbeatEndpoint} />
                        <Button className="h-9 max-lg:h-11" onClick={() => notify('Copied')}>
                          Copy
                        </Button>
                      </div>
                    ) : (
                      <Input id={id} disabled className="font-mono" value="" placeholder="Made when you create the monitor" />
                    )
                  }
                </Field>
              ) : (
                <Field label={targetLabel(draft.type)}>
                  {(id) => <Input id={id} className="font-mono" value={draft.url} placeholder={targetPlaceholder(draft.type)} onChange={(event) => set('url', event.target.value)} required />}
                </Field>
              )}
              <Field label="Name">{(id) => <Input id={id} value={draft.name} onChange={(event) => set('name', event.target.value)} required />}</Field>
            </Group>
            {isHttp(draft.type) && (
              <Group label="Expect">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                  <Field label="Status">{(id) => <Input id={id} inputMode="numeric" className="font-mono" value={draft.status} onChange={(event) => set('status', event.target.value)} />}</Field>
                  <Field label="Page contains">{(id) => <Input id={id} value={draft.body} onChange={(event) => set('body', event.target.value)} />}</Field>
                </div>
              </Group>
            )}
            <Group label="Schedule">
              <div className={cn('grid gap-3', heartbeat ? 'grid-cols-1 sm:max-w-48' : 'grid-cols-3')}>
                <Field label={heartbeat ? 'A heartbeat every' : 'Every'}>
                  {(id) => (
                    <Select id={id} value={draft.interval} onChange={(event) => set('interval', Number(event.target.value))}>
                      {INTERVALS.map((seconds) => (
                        <option key={seconds} value={seconds}>
                          {every(seconds)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                {!heartbeat && (
                  <>
                    <Field label="Timeout, s">{(id) => <Input id={id} inputMode="numeric" className="font-mono" value={draft.timeout} onChange={(event) => set('timeout', event.target.value)} />}</Field>
                    <Field label="Down after">
                      {(id) => (
                        <Select id={id} value={draft.threshold} onChange={(event) => set('threshold', event.target.value)}>
                          {[1, 2, 3, 5].map((count) => (
                            <option key={count} value={count}>
                              {count} failed
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                  </>
                )}
              </div>
            </Group>
            <Group label="Belongs to">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Project">
                  {(id) => (
                    <Select id={id} value={draft.project} onChange={(event) => set('project', event.target.value)}>
                      <option value="">None</option>
                      {PROJECTS.map((slug) => (
                        <option key={slug}>{slug}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Environment">
                  {(id) => (
                    <Select id={id} value={draft.env} disabled={!draft.project} onChange={(event) => set('env', event.target.value)}>
                      <option value="">Any</option>
                      {ENVIRONMENTS.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
            </Group>
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t p-3">
            <Button className="max-lg:h-11" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="default" className="max-lg:h-11">
              {monitor ? 'Save monitor' : 'Create monitor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatusPages() {
  const { org, params, go } = useProto()
  const creating = params.get('new') === '1'
  return (
    <>
      <PageBar>
        <Tabs tabs={UPTIME_TABS} current="uptime-monitors/status-pages" to={(key) => ({ to: key })} />
        <Button variant="default" size="sm" className="ml-auto max-lg:h-9" onClick={() => go('uptime-monitors/status-pages', { new: '1' })}>
          New status page
        </Button>
      </PageBar>
      <ul>
        {STATUS_PAGES.map((page) => {
          const monitors = page.monitors.flatMap((id) => monitorById(id) ?? []).sort((a, b) => GROUPS.indexOf(healthOf(a)) - GROUPS.indexOf(healthOf(b)))
          const Visibility = page.isPublic ? Globe : Lock
          const link = 'flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand hover:underline max-lg:min-h-11'
          return (
            <li key={page.slug} className="grid gap-x-6 gap-y-1 border-b px-3 py-3 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_auto] lg:items-center lg:px-4 lg:py-2.5">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 font-medium">
                  <span className="truncate">{page.name}</span>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-normal text-muted-foreground">
                    <Visibility className="size-3.5" />
                    {page.isPublic ? 'Public' : 'Members'}
                  </span>
                </h2>
                <p className="mono truncate text-muted-foreground">
                  /status-pages/{org}/{page.slug}/
                </p>
              </div>
              <ul className="flex min-w-0 flex-wrap gap-x-5 gap-y-1">
                {monitors.length === 0 && <li className="text-muted-foreground">No monitors yet</li>}
                {monitors.map((monitor) => {
                  const health = healthOf(monitor)
                  return (
                    <li key={monitor.id} className="flex items-center gap-1.5">
                      <HealthGlyph health={health} />
                      {monitor.name}
                      {health !== Health.up && <span className={cn('mono', HEALTH[health].color)}>{health === Health.down ? `down ${since(monitor)}` : HEALTH[health].label.toLowerCase()}</span>}
                    </li>
                  )
                })}
              </ul>
              <div className="flex gap-5">
                <a href="/admin/uptime/statuspage/" target="_blank" rel="noreferrer" className={link}>
                  Edit page
                  <ExternalLink className="size-3.5" />
                </a>
                <a href={`/status-pages/${org}/${page.slug}/`} target="_blank" rel="noreferrer" className={link}>
                  Open page
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </li>
          )
        })}
      </ul>
      <NewStatusPage open={creating} onClose={() => go('uptime-monitors/status-pages')} />
    </>
  )
}

const ALERT_COLUMNS = 'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,1.5fr)_minmax(0,3fr)]'

function Alerts({ project, alert, base }: Extract<ScreenProps, { screen: 'alerts' }>) {
  const { go } = useProto()
  const projects = project ? [project] : PROJECTS
  const editing = alert === 'new' ? undefined : ALERTS.find((rule) => String(rule.id) === alert)
  const open = (id: string | undefined, slug?: string) => go(base.to, { ...base.search, alert: id, project: id ? slug : project && base.to === 'alerts' ? project : undefined })
  return (
    <>
      <PageBar>
        <span className="text-sm font-medium">Alerts</span>
        {project && <span className="mono text-muted-foreground">{project}</span>}
        <Button variant="default" size="sm" className="ml-auto max-lg:h-9" onClick={() => open('new', project ?? PROJECTS[0])}>
          New rule
        </Button>
      </PageBar>
      <div className={cn('grid h-8 items-center gap-x-4 border-b px-4 max-lg:hidden', ALERT_COLUMNS)}>
        <span className="label-caps">Rule</span>
        <span className="label-caps">Alerts when</span>
        <span className="label-caps">Environments</span>
        <span className="label-caps">Tells</span>
      </div>
      {projects.map((slug) => {
        const rules = ALERTS.filter((rule) => rule.project === slug)
        return (
          <section key={slug} aria-label={slug}>
            <h2 className="label-caps flex h-8 items-center gap-2 border-b bg-muted/60 px-3 font-semibold tracking-normal normal-case lg:px-4">
              {slug}
              <span className="font-normal">{rules.length}</span>
            </h2>
            {rules.length === 0 && (
              <p className="flex min-h-11 items-center gap-3 border-b px-3 text-muted-foreground lg:px-4">
                No rules.
                <button type="button" className="min-h-11 text-brand hover:underline" onClick={() => open('new', slug)}>
                  Add one
                </button>
              </p>
            )}
            <ul>
              {rules.map((rule) => (
                <li key={rule.id} className="border-b">
                  <button
                    type="button"
                    onClick={() => open(String(rule.id), slug)}
                    className={cn('grid w-full grid-cols-1 items-center gap-x-4 gap-y-1 px-3 py-2.5 text-left hover:bg-accent/60 lg:min-h-11 lg:px-4 lg:py-1.5', ALERT_COLUMNS)}
                  >
                    <span className="truncate font-medium">{rule.name}</span>
                    <span className="truncate">{conditions(rule).join(', or ')}</span>
                    <span className="mono truncate text-muted-foreground">{rule.environments.join(', ') || 'all'}</span>
                    <span className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {rule.alertRecipients.map((recipient) => (
                        <RecipientChip key={recipient.id} recipient={recipient} />
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      {alert && <AlertDialog key={alert} rule={editing} project={editing?.project ?? project ?? PROJECTS[0]!} onClose={() => open(undefined)} />}
    </>
  )
}

// A webhook address shortened so it always fits: the host gives way first, the last path segment stays.
function RecipientAddress({ recipient }: { recipient: Recipient }) {
  const [host, tail] = recipientTarget(recipient).split('/…/')
  return (
    <span className="mono flex min-w-0 flex-1 text-xs text-muted-foreground">
      <span className="truncate">{host}</span>
      {tail !== undefined && <span className="shrink-0">/…/{tail}</span>}
    </span>
  )
}

function AlertDialog({ rule, project, onClose }: { rule?: Alert; project: string; onClose: () => void }) {
  const [events, setEvents] = useState(rule ? Boolean(rule.quantity) : true)
  const [down, setDown] = useState(rule?.uptime ?? false)
  const [environments, setEnvironments] = useState(rule?.environments ?? [])
  const [recipients, setRecipients] = useState<Recipient[]>(rule?.alertRecipients ?? [{ id: -1, recipientType: RecipientType.email, url: '' }])
  const done = () => {
    saved()
    onClose()
  }
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined} onOpenAutoFocus={(event) => event.preventDefault()} className="top-[6vh] flex max-h-[88vh] max-w-xl flex-col">
        <div className="flex h-11 shrink-0 items-center justify-between border-b pr-1.5 pl-4">
          <DialogTitle className="text-base">{rule ? 'Edit rule' : 'New rule'}</DialogTitle>
          <DialogClose aria-label="Close" className="grid size-8 place-items-center hover:bg-accent max-lg:size-11">
            <X className="size-4" />
          </DialogClose>
        </div>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            done()
          }}
        >
          <div className="flex min-h-0 flex-col gap-5 overflow-x-hidden overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">{(id) => <Input id={id} defaultValue={rule?.name ?? ''} required />}</Field>
              <Field label="Project">
                {(id) => (
                  <Select id={id} defaultValue={project} disabled={Boolean(rule)}>
                    {PROJECTS.map((slug) => (
                      <option key={slug}>{slug}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-sm font-medium">Alert when</legend>
              <div className="flex min-h-11 items-center gap-x-1.5 border-y py-1.5 whitespace-nowrap lg:gap-x-2">
                <Checkbox checked={events} onCheckedChange={(checked) => setEvents(checked === true)} aria-label="An issue gets many events" />
                <span>an issue gets</span>
                <Input aria-label="Events" inputMode="numeric" disabled={!events} defaultValue={rule?.quantity ?? 10} className="h-8 w-14 shrink-0 px-1 text-center font-mono max-lg:h-10 max-lg:w-11" />
                <span>events in</span>
                <Input aria-label="Minutes" inputMode="numeric" disabled={!events} defaultValue={rule?.timespanMinutes ?? 5} className="h-8 w-14 shrink-0 px-1 text-center font-mono max-lg:h-10 max-lg:w-10" />
                <span>minutes</span>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 border-b">
                <Checkbox checked={down} onCheckedChange={(checked) => setDown(checked === true)} />a monitor goes down
              </label>
              {!events && !down && <p className="mt-1.5 text-sm text-destructive">Pick at least one.</p>}
            </fieldset>

            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-sm font-medium">Tell</legend>
              <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {recipients.map((recipient) => {
                  const meta = recipientMeta(recipient)
                  return (
                    <li key={recipient.id} className="flex h-9 max-w-full min-w-0 items-center gap-2 border bg-background pl-2.5 max-lg:h-11" title={recipient.url || undefined}>
                      <meta.icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="shrink-0 text-sm font-medium">{meta.label}</span>
                      <RecipientAddress recipient={recipient} />
                      <button
                        type="button"
                        aria-label={`Remove ${meta.label}`}
                        onClick={() => setRecipients((current) => current.filter((other) => other.id !== recipient.id))}
                        className="grid h-full w-8 shrink-0 place-items-center border-l text-muted-foreground hover:bg-accent hover:text-foreground max-lg:w-11"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  )
                })}
                <li>
                  <AddRecipient hasEmail={recipients.some((recipient) => recipient.recipientType === RecipientType.email)} onAdd={(recipient) => setRecipients((current) => [...current, recipient])} />
                </li>
              </ul>
            </fieldset>

            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-sm font-medium">Environments</legend>
              <div className="flex flex-wrap items-center gap-2">
                {ENVIRONMENTS.map((name) => {
                  const on = environments.includes(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setEnvironments((current) => (on ? current.filter((value) => value !== name) : [...current, name]))}
                      className={cn('mono h-8 border px-2.5 max-lg:h-11', on ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-accent')}
                    >
                      {name}
                    </button>
                  )
                })}
                {environments.length === 0 && <span className="text-sm text-muted-foreground">All</span>}
              </div>
            </fieldset>
          </div>
          <div className="flex shrink-0 items-center gap-2 border-t p-3">
            {rule && (
              <Button variant="destructive" onClick={done} className="max-lg:h-11">
                Delete
              </Button>
            )}
            <span className="flex-1" />
            {rule ? (
              <Button className="max-lg:h-11" onClick={() => notify(`Test sent to ${recipients.length} ${recipients.length === 1 ? 'recipient' : 'recipients'}`)}>
                Send test
              </Button>
            ) : (
              <Button className="max-lg:h-11" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="default" className="max-lg:h-11" disabled={!events && !down}>
              {rule ? 'Save rule' : 'Create rule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function dayName(time: number): string {
  const days = Math.floor((new Date(NOW).setHours(24, 0, 0, 0) - time) / DAY)
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : dayLabel(time / 1000)
}

function Releases() {
  const range = spanFor(Period.fortnight)
  const marks = marksIn(range)
  const days = new Map<string, Release[]>()
  for (const release of RELEASES) days.set(dayName(Date.parse(release.dateCreated)), [...(days.get(dayName(Date.parse(release.dateCreated))) ?? []), release])
  const peak = Math.max(...ORG_EVENTS, 1)
  return (
    <>
      <PageBar>
        <span className="text-sm font-medium">Releases</span>
        <span className="mono text-muted-foreground">{RELEASES.length}</span>
      </PageBar>
      <div className="mx-auto w-full max-w-4xl pb-16">
        <div className="border-b px-3 pt-3 pb-3 lg:px-4">
          <MarkRows marks={marks} />
          <div className="relative flex h-[57px] items-end gap-px border-b border-foreground/30" aria-hidden>
            {marks.map((mark) => (
              <span key={mark.at} className="absolute inset-y-0 w-px bg-brand/60" style={{ left: `${mark.at * 100}%` }} />
            ))}
            {ORG_EVENTS.map((value, index) => (
              <span key={index} className="min-w-0 flex-1 bg-foreground/45" style={{ height: Math.max(2, Math.round((value / peak) * 56)) }} />
            ))}
          </div>
          <p className="label-caps mt-1.5 flex justify-between">
            <span>{dayLabel(range.from / 1000)}</span>
            <span>Events / day</span>
            <span>Today</span>
          </p>
        </div>
        {[...days].map(([day, releases]) => (
          <section key={day} aria-label={day}>
            <h2 className="label-caps sticky top-11 z-10 flex h-9 items-center border-b bg-background px-3 lg:px-4">{day}</h2>
            <ul>
              {releases.map((release) => {
                const fresh = releaseIssues(release.version).filter((issue) => issue.firstSeenHere).length
                const deploys = releaseDeploys(release)
                return (
                  <li key={release.version} className="border-b">
                    <PLink to={`releases/${encodeURIComponent(release.version)}`} className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 px-3 py-3 hover:bg-accent/60 lg:grid-cols-[56px_minmax(0,1fr)] lg:px-4">
                      <time className="mono pt-0.5 text-muted-foreground">{clockTime(release.dateCreated)}</time>
                      <span className="min-w-0">
                        <span className="flex items-baseline gap-3">
                          <span className="mono min-w-0 truncate text-[0.9375rem] font-semibold">{release.shortVersion}</span>
                          {fresh > 0 && (
                            <span className="shrink-0 text-trend-new">
                              <span className="mono font-semibold">{fresh}</span> new {fresh === 1 ? 'issue' : 'issues'}
                            </span>
                          )}
                        </span>
                        <span className="mono mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                          <span>{release.projects.map((project) => project.slug).join(', ')}</span>
                          <span>{deploys.length ? `live on ${deploys.map((deploy) => deploy.environment).join(', ')}` : 'not deployed'}</span>
                          {release.commitCount > 0 && <span>{release.commitCount} commits</span>}
                        </span>
                      </span>
                    </PLink>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
