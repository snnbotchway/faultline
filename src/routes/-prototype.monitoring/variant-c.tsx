// PROTOTYPE, throwaway. Variant C, "Logbook": uptime opens on what is happening now and a dated log of what
// happened (downtime and releases together). A monitor is added by typing its address into the list;
// an alert rule unfolds in place and its recipients are chips.
import { ChevronDown, ExternalLink, Globe, Lock, Package, Plus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ago, compact, dayLabel } from '@/features/issues/format'
import { LevelGlyph } from '@/features/issues/parts'
import { notify } from '@/lib/notice'
import { cn } from '@/lib/utils'
import {
  ALERTS,
  ENVIRONMENTS,
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
  State,
  downFirst,
  incidents,
  monitorById,
  releaseCommits,
  releaseDeploys,
  releaseFiles,
  releaseIssues,
  responseNow,
  spanFor,
  stateOf,
  uptime,
  type Alert,
  type Monitor,
  type Outline,
  type Recipient,
  type Release,
  type ReleaseIssue,
} from './data'
import type { ScreenProps } from './index'
import {
  Band,
  Bars,
  Field,
  INTERVALS,
  MarkLabels,
  PLink,
  RECIPIENTS,
  ResponseBars,
  Section,
  Segmented,
  Select,
  Stat,
  StateGlyph,
  TYPE_OPTIONS,
  Tabs,
  bytes,
  clockTime,
  conditions,
  draftFrom,
  every,
  isHttp,
  percent,
  recipientMeta,
  recipientTarget,
  releaseMarksIn,
  responseText,
  span,
  stampTime,
  stateLine,
  targetLabel,
  useProto,
  type Draft,
} from './shared'
import { NewStatusPage } from './variant-a'

const saved = () => notify('Prototype: nothing was saved')
const now = new Date(NOW)
const DAY = 86_400_000

export function VariantC(props: ScreenProps) {
  switch (props.screen) {
    case 'uptime':
      return <UptimeHome />
    case 'monitor-form':
      return props.monitor ? <MonitorPage monitor={props.monitor} editing /> : <UptimeHome adding />
    case 'monitor':
      return <MonitorPage monitor={props.monitor} />
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

const UPTIME_TABS = [
  { key: 'uptime-monitors', label: 'Uptime' },
  { key: 'uptime-monitors/status-pages', label: 'Status pages', count: STATUS_PAGES.length },
]

function dayName(time: number): string {
  const days = Math.floor((new Date(NOW).setHours(24, 0, 0, 0) - time) / DAY)
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : dayLabel(time / 1000)
}

function byDay<T extends { time: number }>(entries: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const entry of [...entries].sort((a, b) => b.time - a.time)) groups.set(dayName(entry.time), [...(groups.get(dayName(entry.time)) ?? []), entry])
  return [...groups]
}

// A square for a stretch of downtime: filled while it lasts, an outline once it is over.
function OutageGlyph({ ongoing }: { ongoing: boolean }) {
  return (
    <svg viewBox="0 0 10 10" className="size-2.5 shrink-0 text-destructive" role="img" aria-label={ongoing ? 'Down now' : 'Recovered'}>
      {ongoing ? <rect width="10" height="10" fill="currentColor" /> : <rect x="0.75" y="0.75" width="8.5" height="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  )
}

type LogEntry = { time: number } & ({ monitor: Monitor; outage: Outline } | { release: Release })

function UptimeHome({ adding = false }: { adding?: boolean }) {
  const sorted = downFirst(MONITORS)
  const down = sorted.filter((monitor) => stateOf(monitor) === State.down)
  const entries: LogEntry[] = [
    ...MONITORS.flatMap((monitor) => incidents(monitor).map((outage) => ({ time: outage.from, monitor, outage }))),
    ...RELEASES.map((release) => ({ time: Date.parse(release.dateCreated), release })),
  ]
  return (
    <>
      <PageBar>
        <Tabs tabs={UPTIME_TABS} current="uptime-monitors" to={(key) => ({ to: key })} />
      </PageBar>
      <AddMonitor open={adding} />

      <section aria-labelledby="now" className="border-b">
        <h2 id="now" className="flex flex-wrap items-baseline gap-x-4 px-3 pt-4 pb-3 lg:px-4">
          <span className={cn('text-2xl font-semibold', down.length ? 'text-destructive' : 'text-ok')}>
            {down.length === 0 ? 'Everything is up' : down.length === 1 ? `${down[0]!.name} is down` : `${down.length} monitors are down`}
          </span>
          <span className="mono text-muted-foreground">
            {sorted.length - down.length} of {sorted.length} up
          </span>
        </h2>
        <ul className="grid grid-cols-2 border-t lg:grid-cols-[repeat(auto-fill,minmax(232px,1fr))]">
          {sorted.map((monitor) => {
            const state = stateOf(monitor)
            return (
              <li key={monitor.id} className="-mb-px border-r border-b">
                <PLink to={`uptime-monitors/${monitor.id}`} className={cn('block h-full px-3 py-2.5 transition-colors duration-100 lg:px-4', state === State.down ? 'bg-hit' : 'hover:bg-accent/60')}>
                  <span className="flex items-center gap-2">
                    <StateGlyph state={state} />
                    <span className="truncate font-medium">{monitor.name}</span>
                  </span>
                  <span className={cn('mono mt-0.5 block truncate pl-[18px]', state === State.down ? 'text-destructive' : 'text-muted-foreground')}>
                    {state === State.up && monitor.monitorType !== MonitorType.heartbeat ? `${responseText(responseNow(monitor))} · ${percent(uptime(monitor, spanFor(Period.day)))}` : stateLine(monitor).toLowerCase()}
                  </span>
                </PLink>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="mx-auto w-full max-w-4xl pb-16">
        {byDay(entries).map(([day, items]) => (
          <section key={day}>
            <h2 className="label-caps sticky top-11 z-10 flex h-9 items-center border-b bg-background px-3 lg:px-4">{day}</h2>
            <ul>
              {items.map((entry) =>
                'release' in entry ? (
                  <li key={entry.release.version} className="border-b">
                    <PLink to={`releases/${encodeURIComponent(entry.release.version)}`} className="grid min-h-11 grid-cols-[48px_minmax(0,1fr)] items-center gap-x-3 px-3 py-2 hover:bg-accent/60 lg:grid-cols-[56px_minmax(0,1fr)] lg:px-4">
                      <time className="mono text-muted-foreground">{clockTime(entry.time)}</time>
                      <span className="flex min-w-0 items-center gap-2">
                        <Package className="size-3.5 shrink-0 text-brand" />
                        <span className="mono truncate font-semibold">{entry.release.shortVersion}</span>
                        <span className="shrink-0">released</span>
                        <span className="mono truncate text-muted-foreground max-lg:hidden">{entry.release.projects.map((project) => project.slug).join(', ')}</span>
                      </span>
                    </PLink>
                  </li>
                ) : (
                  <li key={`${entry.monitor.id}-${entry.time}`} className="border-b">
                    <PLink to={`uptime-monitors/${entry.monitor.id}`} className="grid min-h-11 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2 hover:bg-accent/60 lg:grid-cols-[56px_minmax(0,1fr)_auto] lg:px-4">
                      <time className="mono text-muted-foreground">{clockTime(entry.time)}</time>
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                        <OutageGlyph ongoing={entry.outage.ongoing} />
                        <span className="font-medium">{entry.monitor.name}</span>
                        <span>{entry.outage.ongoing ? 'is down' : 'was down'}</span>
                        <span className="text-muted-foreground">{entry.monitor.monitorType === MonitorType.heartbeat ? 'No heartbeat' : REASONS[entry.outage.reason]}</span>
                      </span>
                      <span className={cn('mono text-right', entry.outage.ongoing ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
                        {span(entry.outage.to - entry.outage.from)}
                        {entry.outage.ongoing && ' so far'}
                      </span>
                    </PLink>
                  </li>
                ),
              )}
            </ul>
          </section>
        ))}
        <div className="px-3 pt-4 lg:px-4">
          <Button size="sm" className="max-lg:h-11">
            Earlier
          </Button>
        </div>
      </div>
    </>
  )
}

// What the address alone tells us: the kind of check and a name to start from.
function guess(address: string): Pick<Draft, 'type' | 'name'> {
  const text = address.trim()
  if (/^https?:\/\//i.test(text)) {
    try {
      return { type: MonitorType.get, name: new URL(text).host.replace(/^www\./, '') }
    } catch {
      return { type: MonitorType.get, name: '' }
    }
  }
  if (/:\d+$/.test(text)) return { type: MonitorType.port, name: text.replace(/:\d+$/, '') }
  return { type: MonitorType.ping, name: text }
}

function MonitorFields({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(key: K, value: Draft[K]) => void }) {
  const heartbeat = draft.type === MonitorType.heartbeat
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <Field label="Name" className="col-span-2">
        {(id) => <Input id={id} value={draft.name} onChange={(event) => set('name', event.target.value)} required />}
      </Field>
      <Field label="Check">
        {(id) => (
          <Select id={id} value={draft.type} onChange={(event) => set('type', event.target.value as MonitorType)}>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={heartbeat ? 'Expect one every' : 'Every'}>
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
      {isHttp(draft.type) && (
        <>
          <Field label="Status">{(id) => <Input id={id} inputMode="numeric" className="font-mono" value={draft.status} onChange={(event) => set('status', event.target.value)} />}</Field>
          <Field label="Page contains" className="lg:col-span-2">
            {(id) => <Input id={id} value={draft.body} onChange={(event) => set('body', event.target.value)} />}
          </Field>
        </>
      )}
      <Field label="Project" className={cn(!isHttp(draft.type) && 'lg:col-start-1')}>
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
  )
}

function AddMonitor({ open }: { open: boolean }) {
  const { go } = useProto()
  const [draft, setDraft] = useState<Draft>(() => draftFrom())
  const [touched, setTouched] = useState<Set<keyof Draft>>(new Set())
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setTouched((current) => new Set(current).add(key))
    setDraft((current) => ({ ...current, [key]: value }))
  }
  const typeAddress = (url: string) => {
    const guessed = guess(url)
    setDraft((current) => ({ ...current, url, type: touched.has('type') ? current.type : guessed.type, name: touched.has('name') ? current.name : guessed.name }))
  }
  const heartbeat = draft.type === MonitorType.heartbeat
  const unfolded = open || draft.url.trim() !== ''
  return (
    <form
      className="border-b bg-card px-3 py-3 lg:px-4"
      onSubmit={(event) => {
        event.preventDefault()
        saved()
        go('uptime-monitors')
      }}
    >
      <div className="flex items-end gap-2">
        <Field label="New monitor" className="flex-1">
          {(id) => (
            <Input
              id={id}
              className="font-mono"
              value={heartbeat ? '' : draft.url}
              disabled={heartbeat}
              autoFocus={open}
              placeholder={heartbeat ? 'A heartbeat gets its own address once it is added' : 'https://example.com/health, db.example.com:5432 or a host name'}
              onChange={(event) => typeAddress(event.target.value)}
              onFocus={() => !open && go('uptime-monitors/new')}
              required={!heartbeat}
            />
          )}
        </Field>
        <Button type="submit" variant="default" size="lg" className="max-lg:h-11">
          Add monitor
        </Button>
      </div>
      {unfolded && (
        <div className="pt-4 pb-1">
          <MonitorFields draft={draft} set={set} />
          <PLink to="uptime-monitors" className="mt-3 inline-flex min-h-9 items-center text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </PLink>
        </div>
      )}
    </form>
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

function MonitorPage({ monitor, editing = false }: { monitor: Monitor; editing?: boolean }) {
  const { go } = useProto()
  const [draft, setDraft] = useState<Draft>(() => draftFrom(monitor))
  const [unfolded, setUnfolded] = useState<number | undefined>(() => incidents(monitor).find((outage) => outage.ongoing)?.from)
  const state = stateOf(monitor)
  const heartbeat = monitor.monitorType === MonitorType.heartbeat
  const outages = incidents(monitor)
  const rules = ALERTS.filter((alert) => alert.project === monitor.projectName && alert.uptime)
  const to = `uptime-monitors/${monitor.id}`
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
        {!editing && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button asChild size="sm" className="max-lg:h-9">
              <PLink to={`${to}/update`}>Edit</PLink>
            </Button>
            <Button size="sm" variant="destructive" className="max-lg:h-9" onClick={saved}>
              Delete
            </Button>
          </div>
        )}
      </PageBar>

      <div className="mx-auto grid w-full max-w-6xl gap-x-10 px-3 pb-16 md:px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <header className="py-5">
            <h1 className={cn('flex items-center gap-3 text-2xl font-semibold', state === State.down && 'text-destructive')}>
              <StateGlyph state={state} className="size-3.5" />
              {monitor.name} {state === State.down ? 'is down' : state === State.up ? 'is up' : 'has not reported yet'}
            </h1>
            <p className="mono mt-2 [overflow-wrap:anywhere] text-muted-foreground">{heartbeat ? `a heartbeat every ${every(monitor.interval)}` : `${monitor.monitorType} ${monitor.url} every ${every(monitor.interval)}`}</p>
          </header>

          {editing && (
            <form
              className="mb-6 border bg-card p-3 lg:p-4"
              onSubmit={(event) => {
                event.preventDefault()
                saved()
                go(to)
              }}
            >
              {!heartbeat && (
                <Field label={targetLabel(draft.type)} className="mb-3">
                  {(id) => <Input id={id} className="font-mono" value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} required />}
                </Field>
              )}
              <MonitorFields draft={draft} set={(key, value) => setDraft((current) => ({ ...current, [key]: value }))} />
              <div className="mt-4 flex gap-2">
                <Button type="submit" variant="default" className="max-lg:h-11">
                  Save monitor
                </Button>
                <Button asChild className="max-lg:h-11">
                  <PLink to={to}>Cancel</PLink>
                </Button>
              </div>
            </form>
          )}

          <Section label="Downtime" count={outages.length}>
            {outages.length === 0 && <p className="py-4 text-muted-foreground">{state === State.waiting ? 'Nothing to show until the first check.' : 'No downtime recorded.'}</p>}
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
                      <span className={cn('mono', outage.ongoing ? 'font-semibold text-destructive' : '')}>
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
                          ['Told', rules.length ? rules.flatMap((rule) => rule.alertRecipients.map((recipient) => recipientMeta(recipient).label)).join(', ') : 'nobody'],
                        ].map(([label, value]) => (
                          <div key={label} className="flex min-h-8 items-center justify-between gap-4">
                            <dt className="text-muted-foreground">{label}</dt>
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
              {monitor.checks.slice(0, 8).map((check) => (
                <li key={check.startCheck} className="grid min-h-9 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_64px] items-center gap-3 border-b lg:grid-cols-[132px_minmax(0,1fr)_72px]">
                  <time className="mono text-muted-foreground">{stampTime(check.startCheck)}</time>
                  <span className="flex items-center gap-2">
                    <StateGlyph state={check.isUp ? State.up : State.down} />
                    <span className={cn('truncate', !check.isUp && 'text-destructive')}>{check.isUp ? 'Up' : REASONS[check.reason ?? 0]}</span>
                  </span>
                  <span className="mono text-right">{responseText(check.responseTime)}</span>
                </li>
              ))}
            </ul>
            {monitor.checks.length === 0 && <p className="py-4 text-muted-foreground">No checks yet.</p>}
            {monitor.checks.length > 8 && (
              <Button size="sm" className="mt-3 max-lg:h-11">
                Older checks
              </Button>
            )}
          </Section>
        </div>

        <aside className="flex flex-col gap-7 pt-5 max-lg:order-first max-lg:pb-6 lg:border-l lg:pl-6">
          <dl className="grid grid-cols-3 gap-x-4 gap-y-4 lg:grid-cols-2">
            <Stat label="24h" value={percent(uptime(monitor, spanFor(Period.day))) || 'no data'} />
            <Stat label="14d" value={percent(uptime(monitor, spanFor(Period.fortnight))) || 'no data'} />
            {!heartbeat && <Stat label="Response" value={responseText(responseNow(monitor)) || 'no data'} />}
          </dl>
          {!heartbeat && monitor.checks.length > 0 && (
            <div className="max-lg:hidden">
              <ResponseBars checks={monitor.checks} height={56} />
              <p className="label-caps mt-1.5 flex justify-between">
                <span>{clockTime(monitor.checks.at(-1)!.startCheck)}</span>
                <span>Response</span>
                <span>Now</span>
              </p>
            </div>
          )}
          {heartbeat && (
            <Section label="Heartbeat address" action={<Button size="sm" onClick={() => notify('Copied')}>Copy</Button>}>
              <p className="mono mt-3 overflow-x-auto border bg-code px-3 py-2.5 whitespace-nowrap">{monitor.heartbeatEndpoint}</p>
            </Section>
          )}
          <Section label="Setup" className="max-lg:hidden">
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
          <Section label="Alerts" count={rules.length} className="max-lg:hidden">
            <ul>
              {rules.map((rule) => (
                <li key={rule.id} className="border-b">
                  <PLink to="alerts" search={{ alert: String(rule.id) }} className="block py-2 hover:bg-accent/60">
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
        </aside>
      </div>
    </>
  )
}

function StatusPages() {
  const { org } = useProto()
  const [creating, setCreating] = useState(false)
  const fortnight = spanFor(Period.fortnight)
  return (
    <>
      <PageBar>
        <Tabs tabs={UPTIME_TABS} current="uptime-monitors/status-pages" to={(key) => ({ to: key })} />
        <Button variant="default" size="sm" className="ml-auto max-lg:h-9" onClick={() => setCreating(true)}>
          New status page
        </Button>
      </PageBar>
      <div className="mx-auto w-full max-w-4xl pb-16">
        {STATUS_PAGES.map((page) => {
          const monitors = downFirst(page.monitors.flatMap((id) => monitorById(id) ?? []))
          const down = monitors.filter((monitor) => stateOf(monitor) === State.down).length
          const Visibility = page.isPublic ? Globe : Lock
          return (
            <section key={page.slug} className="border-b px-3 py-5 lg:px-4">
              <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 className="text-xl font-semibold">{page.name}</h2>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Visibility className="size-3.5" />
                  {page.isPublic ? 'Anyone with the link' : 'Members only'}
                </span>
                <span className="ml-auto flex gap-2 max-lg:ml-0 max-lg:w-full">
                  <Button asChild size="sm" className="max-lg:h-11">
                    <a href="/admin/uptime/statuspage/" target="_blank" rel="noreferrer">
                      Edit in admin
                      <ExternalLink />
                    </a>
                  </Button>
                  <Button asChild size="sm" className="max-lg:h-11">
                    <a href={`/status-pages/${org}/${page.slug}/`} target="_blank" rel="noreferrer">
                      Open page
                      <ExternalLink />
                    </a>
                  </Button>
                </span>
              </header>
              {monitors.length === 0 ? (
                <p className="mt-3 text-muted-foreground">No monitors on this page yet.</p>
              ) : (
                <>
                  <p className={cn('mt-1 font-medium', down ? 'text-destructive' : 'text-ok')}>{down ? `${down} of ${monitors.length} down` : 'Everything is up'}</p>
                  <ul className="mt-3 border-t">
                    {monitors.map((monitor) => (
                      <li key={monitor.id} className="grid min-h-11 grid-cols-[minmax(0,1fr)_88px_64px] items-center gap-x-4 border-b sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_64px]">
                        <span className="flex items-center gap-2">
                          <StateGlyph state={stateOf(monitor)} />
                          <span className="truncate font-medium">{monitor.name}</span>
                        </span>
                        <Band monitor={monitor} range={fortnight} height={18} />
                        <span className="mono text-right">{percent(uptime(monitor, fortnight))}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )
        })}
      </div>
      <NewStatusPage open={creating} onClose={() => setCreating(false)} />
    </>
  )
}

function Alerts({ project, alert, base }: Extract<ScreenProps, { screen: 'alerts' }>) {
  const { go } = useProto()
  const stock = base.to !== 'alerts'
  const rules = ALERTS.filter((rule) => !project || rule.project === project)
  const open = (id?: string) => go(base.to, { ...base.search, project: stock ? undefined : project, alert: id })
  const blank: Alert = { id: 0, project: project ?? PROJECTS[0]!, name: '', quantity: 10, timespanMinutes: 5, uptime: false, environments: [], alertRecipients: [{ id: -1, recipientType: RecipientType.email, url: '' }] }
  return (
    <>
      <PageBar>
        <span className="text-sm font-medium">Alerts</span>
        {stock ? (
          <span className="mono text-muted-foreground">{project}</span>
        ) : (
          <>
            <Segmented
              label="Project"
              value={project ?? ''}
              options={[{ value: '', label: 'All' }, ...PROJECTS.map((slug) => ({ value: slug, label: slug }))]}
              onChange={(value) => go('alerts', { project: value || undefined })}
              className="shrink-0 max-lg:hidden"
            />
            <Select aria-label="Project" value={project ?? ''} onChange={(event) => go('alerts', { project: event.target.value || undefined })} className="w-auto max-lg:h-9 lg:hidden">
              <option value="">All projects</option>
              {PROJECTS.map((slug) => (
                <option key={slug}>{slug}</option>
              ))}
            </Select>
          </>
        )}
        <Button variant="default" size="sm" className="ml-auto max-lg:h-9" onClick={() => open('new')}>
          New rule
        </Button>
      </PageBar>
      <div className="mx-auto w-full max-w-5xl pb-16">
        {alert === 'new' && (
          <div className="border-b bg-card">
            <RuleEditor rule={blank} pickProject={!project} onClose={() => open(undefined)} />
          </div>
        )}
        {rules.length === 0 && alert !== 'new' && <p className="px-3 py-6 text-muted-foreground lg:px-4">No rules{project ? ' for this project' : ''}.</p>}
        <ul>
          {rules.map((rule) => {
            const editing = alert === String(rule.id)
            return (
              <li key={rule.id} className="border-b">
                <button
                  type="button"
                  aria-expanded={editing}
                  onClick={() => open(editing ? undefined : String(rule.id))}
                  className={cn('grid w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-x-4 gap-y-1 px-3 py-3 text-left lg:grid-cols-[minmax(0,2fr)_minmax(0,5fr)_20px] lg:px-4', editing ? 'bg-accent' : 'hover:bg-accent/60')}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{rule.name}</span>
                    <span className="mono block truncate text-muted-foreground">{rule.project}</span>
                  </span>
                  <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200 lg:order-last', editing && 'rotate-180')} />
                  <span className="min-w-0 max-lg:col-span-2">
                    <span className="block">
                      When {conditions(rule).join(', or ')}
                      {rule.environments.length > 0 && (
                        <>
                          {' '}
                          in <span className="mono">{rule.environments.join(', ')}</span>
                        </>
                      )}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                      {rule.alertRecipients.map((recipient) => {
                        const meta = recipientMeta(recipient)
                        return (
                          <span key={recipient.id} className="flex min-w-0 items-center gap-1.5 text-sm">
                            <meta.icon className="size-3.5 shrink-0" />
                            <span className="text-foreground">{meta.label}</span>
                            <span className="mono truncate text-xs">{recipientTarget(recipient)}</span>
                          </span>
                        )
                      })}
                    </span>
                  </span>
                </button>
                {editing && (
                  <div className="border-t bg-card">
                    <RuleEditor rule={rule} onClose={() => open(undefined)} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}

function RuleEditor({ rule, pickProject = false, onClose }: { rule: Alert; pickProject?: boolean; onClose: () => void }) {
  const [events, setEvents] = useState(Boolean(rule.quantity))
  const [down, setDown] = useState(rule.uptime)
  const [environments, setEnvironments] = useState(rule.environments)
  const [recipients, setRecipients] = useState<Recipient[]>(rule.alertRecipients)
  const done = () => {
    saved()
    onClose()
  }
  return (
    <form
      className="grid gap-x-10 gap-y-5 px-3 py-4 lg:grid-cols-2 lg:px-4"
      onSubmit={(event) => {
        event.preventDefault()
        done()
      }}
    >
      <div className="flex flex-col gap-4">
        <div className={cn('grid gap-3', pickProject && 'grid-cols-2')}>
          <Field label="Name">{(id) => <Input id={id} defaultValue={rule.name ?? ''} autoFocus={!rule.id} required />}</Field>
          {pickProject && (
            <Field label="Project">
              {(id) => (
                <Select id={id} defaultValue={rule.project}>
                  {PROJECTS.map((slug) => (
                    <option key={slug}>{slug}</option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Alert when</legend>
          <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 border-y py-1.5">
            <Checkbox checked={events} onCheckedChange={(checked) => setEvents(checked === true)} aria-label="An issue gets many events" />
            <span>an issue gets</span>
            <Input aria-label="Events" inputMode="numeric" disabled={!events} defaultValue={rule.quantity ?? 10} className="h-8 w-14 px-1 text-center font-mono max-lg:h-10 max-lg:w-12" />
            <span>events in</span>
            <Input aria-label="Minutes" inputMode="numeric" disabled={!events} defaultValue={rule.timespanMinutes ?? 5} className="h-8 w-14 px-1 text-center font-mono max-lg:h-10 max-lg:w-12" />
            <span>minutes</span>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 border-b">
            <Checkbox checked={down} onCheckedChange={(checked) => setDown(checked === true)} />a monitor goes down
          </label>
        </fieldset>
      </div>

      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Tell</legend>
          <ul className="flex flex-wrap gap-2">
            {recipients.map((recipient) => {
              const meta = recipientMeta(recipient)
              return (
                <li key={recipient.id} className="flex h-9 max-w-full items-center gap-2 border bg-background pl-2.5 max-lg:h-11" title={recipient.url || undefined}>
                  <meta.icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="shrink-0 text-sm font-medium">{meta.label}</span>
                  <span className="mono truncate text-xs text-muted-foreground">{recipientTarget(recipient)}</span>
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
        <fieldset>
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
                  className={cn('mono h-8 border px-2.5 max-lg:h-11', on ? 'border-foreground bg-foreground text-background' : 'bg-background hover:bg-accent')}
                >
                  {name}
                </button>
              )
            })}
            {environments.length === 0 && <span className="text-sm text-muted-foreground">All</span>}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-wrap gap-2 lg:col-span-2">
        <Button type="submit" variant="default" className="max-lg:h-11" disabled={!events && !down}>
          {rule.id ? 'Save rule' : 'Create rule'}
        </Button>
        {rule.id ? (
          <>
            <Button className="max-lg:h-11" onClick={() => notify(`Test sent to ${recipients.length} ${recipients.length === 1 ? 'recipient' : 'recipients'}`)}>
              Send test
            </Button>
            <Button variant="destructive" className="ml-auto max-lg:h-11" onClick={done}>
              Delete
            </Button>
          </>
        ) : (
          <Button className="max-lg:h-11" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

export function AddRecipient({ hasEmail, onAdd }: { hasEmail: boolean; onAdd: (recipient: Recipient) => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<RecipientType>()
  const [url, setUrl] = useState('')
  const add = (recipientType: RecipientType, address: string) => {
    onAdd({ id: -Date.now(), recipientType, url: address })
    setOpen(false)
    setType(undefined)
    setUrl('')
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setType(undefined)
      }}
    >
      <PopoverTrigger asChild>
        <Button className="h-9 max-lg:h-11">
          <Plus />
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(type ? 'w-80' : 'w-56 p-1')}>
        {type ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              add(type, url)
            }}
          >
            <Field label={`${RECIPIENTS[type].label} address`}>
              {(id) => <Input id={id} autoFocus className="font-mono" value={url} placeholder={RECIPIENTS[type].placeholder} onChange={(event) => setUrl(event.target.value)} required />}
            </Field>
            <Button type="submit" variant="default" className="max-lg:h-11">
              Add {RECIPIENTS[type].label}
            </Button>
          </form>
        ) : (
          <ul>
            {(Object.keys(RECIPIENTS) as RecipientType[])
              .filter((value) => value !== RecipientType.email || !hasEmail)
              .map((value) => {
                const meta = RECIPIENTS[value]
                return (
                  <li key={value}>
                    <button type="button" onClick={() => (value === RecipientType.email ? add(value, '') : setType(value))} className="flex h-8 w-full items-center gap-2 px-2 text-left text-sm hover:bg-accent max-lg:h-11">
                      <meta.icon className="size-3.5 text-muted-foreground" />
                      {meta.label}
                    </button>
                  </li>
                )
              })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

function Releases() {
  const range = spanFor(Period.fortnight)
  const marks = releaseMarksIn(range)
  const entries = RELEASES.map((release) => ({ time: Date.parse(release.dateCreated), release }))
  return (
    <>
      <PageBar>
        <span className="text-sm font-medium">Releases</span>
        <span className="mono text-muted-foreground">{RELEASES.length}</span>
      </PageBar>
      <div className="mx-auto w-full max-w-4xl pb-16">
        <div className="border-b px-3 pt-4 pb-3 lg:px-4">
          <MarkLabels marks={marks} />
          <Bars values={ORG_EVENTS} height={56} marks={marks} />
          <p className="label-caps mt-1.5 flex justify-between">
            <span>{dayLabel(range.from / 1000)}</span>
            <span>Events / day</span>
            <span>Today</span>
          </p>
        </div>
        {byDay(entries).map(([day, items]) => (
          <section key={day}>
            <h2 className="label-caps sticky top-11 z-10 flex h-9 items-center border-b bg-background px-3 lg:px-4">{day}</h2>
            <ul>
              {items.map(({ time, release }) => {
                const issues = releaseIssues(release.version)
                const fresh = issues.filter((issue) => issue.firstSeenHere).length
                const deploys = releaseDeploys(release)
                return (
                  <li key={release.version} className="border-b">
                    <PLink to={`releases/${encodeURIComponent(release.version)}`} className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 px-3 py-3 hover:bg-accent/60 lg:grid-cols-[56px_minmax(0,1fr)] lg:px-4">
                      <time className="mono pt-0.5 text-muted-foreground">{clockTime(time)}</time>
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

function IssueRows({ issues }: { issues: ReleaseIssue[] }) {
  return (
    <ul>
      {issues.map((issue) => (
        <li key={issue.id} className="border-b">
          <a href={`../issues/${issue.id}`} className="grid grid-cols-[minmax(0,1fr)_56px] items-center gap-x-4 py-2 hover:bg-accent/60 lg:grid-cols-[minmax(0,1fr)_56px_56px]">
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <LevelGlyph level={issue.level} />
                <span className="truncate max-lg:line-clamp-2 max-lg:whitespace-normal">
                  <span className="font-mono text-[0.8125rem] font-semibold">{issue.type}</span> {issue.value}
                </span>
              </span>
              <span className="mono block pl-[18px] text-muted-foreground">{issue.shortId}</span>
            </span>
            <span className="mono text-right">{compact(issue.count)}</span>
            <time className="mono text-right text-muted-foreground max-lg:hidden">{ago(issue.lastSeen, now)}</time>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function ReleasePage({ release }: { release: Release }) {
  const issues = releaseIssues(release.version)
  const fresh = issues.filter((issue) => issue.firstSeenHere)
  const known = issues.filter((issue) => !issue.firstSeenHere)
  const commits = releaseCommits(release)
  const deploys = releaseDeploys(release)
  const files = releaseFiles(release)
  const [allCommits, setAllCommits] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  return (
    <>
      <PageBar>
        <Crumbs root="Releases" rootTo="releases">
          <span className="font-mono">{release.shortVersion}</span>
        </Crumbs>
      </PageBar>
      <div className="mx-auto grid w-full max-w-6xl gap-x-10 px-3 pb-16 md:px-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <header className="py-5">
            <h1 className="font-mono text-xl font-semibold break-all lg:text-2xl">{release.version}</h1>
            <p className="mono mt-2 text-muted-foreground">
              {release.projects.map((project) => project.slug).join(', ')} · {stampTime(release.dateCreated)}
            </p>
          </header>
          {issues.length === 0 && <p className="border-t py-4 text-muted-foreground">No errors reported from this release.</p>}
          {fresh.length > 0 && (
            <section>
              <h2 className="label-caps flex h-9 items-center gap-2 border-b font-semibold text-trend-new">
                First seen in this release <span className="font-normal text-muted-foreground">{fresh.length}</span>
              </h2>
              <IssueRows issues={fresh} />
            </section>
          )}
          {known.length > 0 && (
            <Section label="Seen before, still happening" count={known.length} className="mt-6">
              <IssueRows issues={known} />
            </Section>
          )}
        </div>

        <aside className="flex flex-col gap-7 pt-5 lg:border-l lg:pl-6">
          <Section label="Deploys" count={deploys.length}>
            {deploys.length === 0 && <p className="py-3 text-muted-foreground">Not deployed anywhere yet.</p>}
            <ul>
              {deploys.map((deploy) => (
                <li key={deploy.id} className="border-b py-2">
                  <span className="flex justify-between gap-3">
                    <span className="mono font-semibold">{deploy.environment}</span>
                    <time className="mono text-muted-foreground">{stampTime(deploy.dateCreated)}</time>
                  </span>
                  <span className="mono block truncate text-muted-foreground">{deploy.url}</span>
                </li>
              ))}
            </ul>
          </Section>
          <Section label="Commits" count={release.commitCount}>
            {commits.length === 0 && <p className="py-3 text-muted-foreground">No commits were sent with this release.</p>}
            <ul>
              {commits.slice(0, allCommits ? undefined : 3).map((commit) => (
                <li key={commit.id} className="border-b py-2">
                  <span className="block">{commit.message}</span>
                  <span className="mono block text-muted-foreground">
                    {commit.id.slice(0, 7)} · {commit.authorName}
                  </span>
                </li>
              ))}
            </ul>
            {!allCommits && commits.length > 3 && (
              <Button size="sm" className="mt-3 max-lg:h-11" onClick={() => setAllCommits(true)}>
                All {release.commitCount} commits
              </Button>
            )}
          </Section>
          <Section
            label="Files"
            count={files.length}
            action={
              files.length > 0 && (
                <Button size="sm" variant="ghost" aria-expanded={showFiles} onClick={() => setShowFiles((current) => !current)} className="max-lg:h-9">
                  {showFiles ? 'Hide' : 'Show'}
                </Button>
              )
            }
          >
            {files.length === 0 && <p className="py-3 text-muted-foreground">No source maps uploaded.</p>}
            {!showFiles && files.length > 0 && <p className="mono py-3 text-muted-foreground">{bytes(files.reduce((sum, file) => sum + file.size, 0))} of source maps and scripts</p>}
            {showFiles && (
              <ul>
                {files.map((file) => (
                  <li key={file.id} className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b max-lg:min-h-11">
                    <span className="mono truncate" title={file.name}>
                      {file.name.replace('~/assets/', '')}
                    </span>
                    <span className="mono text-muted-foreground">{bytes(file.size)}</span>
                    <button type="button" onClick={saved} className="text-sm text-destructive hover:underline max-lg:min-h-11">
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </aside>
      </div>
    </>
  )
}
