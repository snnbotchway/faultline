// PROTOTYPE, throwaway. Variant B, "Console": the list stays on the left and the thing you picked opens beside it.
// A monitor is created in the right pane while the list stays in view; alert recipients are columns of a
// table, switched on per rule.
import { ChevronLeft, ExternalLink, Globe, HeartPulse, Lock, Plug, Plus, Radio, Send, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ago, compact } from '@/features/issues/format'
import { LevelGlyph } from '@/features/issues/parts'
import { notify } from '@/lib/notice'
import { cn } from '@/lib/utils'
import {
  ALERTS,
  ENVIRONMENTS,
  MONITORS,
  MonitorType,
  NOW,
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
  type Check,
  type Monitor,
  type Recipient,
  type Release,
  type StatusPage,
} from './data'
import type { ScreenProps } from './index'
import {
  Band,
  Field,
  INTERVALS,
  MarkLabels,
  PLink,
  RECIPIENTS,
  ResponseBars,
  Section,
  Select,
  Stat,
  StateGlyph,
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
  target,
  targetLabel,
  targetPlaceholder,
  useProto,
  type Draft,
} from './shared'
import { NewStatusPage } from './variant-a'

const saved = () => notify('Prototype: nothing was saved')
const now = new Date(NOW)

export function VariantB(props: ScreenProps) {
  switch (props.screen) {
    case 'uptime':
    case 'monitor':
    case 'monitor-form':
    case 'status-pages':
      return <Uptime {...props} />
    case 'alerts':
      return <Alerts {...props} />
    case 'releases':
      return <Releases />
    case 'release':
      return <Releases release={props.release} />
  }
}

// List on the left, the picked item on the right. On a phone only one of the two shows.
function Split({ list, picked, children }: { list: ReactNode; picked: boolean; children: ReactNode }) {
  return (
    <div className="flex-1 lg:grid lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className={cn('lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-r', picked && 'max-lg:hidden')}>{list}</aside>
      <div className={cn('min-w-0', !picked && 'max-lg:hidden')}>{children}</div>
    </div>
  )
}

function Back({ to, children }: { to: string; children: ReactNode }) {
  return (
    <PLink to={to} className="-ml-2 flex h-11 shrink-0 items-center gap-0.5 pr-1 text-sm font-medium text-muted-foreground lg:hidden">
      <ChevronLeft className="size-4" />
      {children}
    </PLink>
  )
}

const rowClass = (current: boolean) => cn('block border-b px-3 py-2.5 transition-colors duration-100 lg:px-4 lg:py-2', current ? 'bg-selected' : 'hover:bg-accent/60')

// The newest checks as ticks, oldest first: a short tick is a check that passed, a tall one failed.
function Ticks({ checks, className }: { checks: Pick<Check, 'startCheck' | 'isUp'>[]; className?: string }) {
  return (
    <span className={cn('flex h-3.5 items-end gap-px border-b border-foreground/30', className)} aria-hidden>
      {[...checks].reverse().map((check) => (
        <span key={check.startCheck} className={cn('min-w-0 flex-1', check.isUp ? 'h-1 bg-foreground/35' : 'h-full bg-destructive')} />
      ))}
    </span>
  )
}

function Uptime(props: Extract<ScreenProps, { screen: 'uptime' | 'monitor' | 'monitor-form' | 'status-pages' }>) {
  const { params } = useProto()
  const [creatingPage, setCreatingPage] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(props.screen === 'monitor-form' ? props.monitor : undefined))
  const sorted = downFirst(MONITORS)
  const adding = props.screen === 'monitor-form' && !props.monitor
  const page = props.screen === 'status-pages' ? (STATUS_PAGES.find((candidate) => candidate.slug === params.get('page')) ?? STATUS_PAGES[0]!) : undefined
  // On a wide screen the list alone is half a page, so the first monitor (a down one, if any) is open.
  const monitor = props.screen === 'monitor' || props.screen === 'monitor-form' ? props.monitor : props.screen === 'uptime' ? sorted[0] : undefined
  const down = MONITORS.filter((candidate) => stateOf(candidate) === State.down).length

  const list = (
    <>
      <PageBar>
        <span className="text-sm font-medium">Monitors</span>
        <span className={cn('mono', down ? 'text-destructive' : 'text-muted-foreground')}>{down ? `${down} down` : 'all up'}</span>
        <Button asChild variant="default" size="sm" className="ml-auto max-lg:h-9">
          <PLink to="uptime-monitors/new">New monitor</PLink>
        </Button>
      </PageBar>
      {adding && (
        <div className={rowClass(true)}>
          <span className="flex items-center gap-2">
            <StateGlyph state={State.waiting} />
            <span className={cn('truncate font-medium', !draft.name && 'text-muted-foreground')}>{draft.name || 'New monitor'}</span>
          </span>
          <span className="mono mt-0.5 block truncate pl-[18px] text-muted-foreground">{draft.type === MonitorType.heartbeat ? `every ${every(draft.interval)}` : draft.url.replace(/^https?:\/\//, '') || 'not saved'}</span>
        </div>
      )}
      <ul>
        {sorted.map((item) => {
          const state = stateOf(item)
          return (
            <li key={item.id}>
              <PLink to={`uptime-monitors/${item.id}`} className={rowClass(!adding && !page && monitor?.id === item.id)} aria-current={monitor?.id === item.id ? 'page' : undefined}>
                <span className="flex items-center gap-2">
                  <StateGlyph state={state} />
                  <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                  <span className={cn('mono shrink-0', state === State.down ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
                    {state === State.waiting ? 'no check yet' : `${state} ${item.lastChange ? ago(item.lastChange, now) : ''}`}
                  </span>
                </span>
                <span className="mt-1.5 flex items-center gap-3 pl-[18px]">
                  <span className="mono min-w-0 flex-1 truncate text-muted-foreground">{target(item)}</span>
                  {item.checks.length > 0 && <Ticks checks={item.checks.slice(0, 30)} className="w-[92px] shrink-0" />}
                </span>
              </PLink>
            </li>
          )
        })}
      </ul>
      <h2 className="label-caps flex h-11 items-center justify-between border-b bg-muted/60 pr-1 pl-3 lg:h-9 lg:pl-4">
        Status pages
        <Button variant="ghost" size="sm" className="tracking-normal normal-case max-lg:h-11" onClick={() => setCreatingPage(true)}>
          <Plus />
          New
        </Button>
      </h2>
      <ul>
        {STATUS_PAGES.map((item) => {
          const Visibility = item.isPublic ? Globe : Lock
          return (
            <li key={item.slug}>
              <PLink to="uptime-monitors/status-pages" search={{ page: item.slug ?? undefined }} className={cn(rowClass(page?.slug === item.slug), 'flex min-h-11 items-center gap-2 lg:min-h-9')}>
                <Visibility className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                <span className="mono text-muted-foreground">{item.monitors.length}</span>
              </PLink>
            </li>
          )
        })}
      </ul>
      <NewStatusPage open={creatingPage} onClose={() => setCreatingPage(false)} />
    </>
  )

  return (
    <Split list={list} picked={props.screen !== 'uptime'}>
      {props.screen === 'monitor-form' ? (
        <MonitorForm monitor={props.monitor} draft={draft} setDraft={setDraft} />
      ) : page ? (
        <StatusPagePane page={page} />
      ) : monitor ? (
        <MonitorPane key={monitor.id} monitor={monitor} />
      ) : null}
    </Split>
  )
}

function MonitorPane({ monitor }: { monitor: Monitor }) {
  const state = stateOf(monitor)
  const heartbeat = monitor.monitorType === MonitorType.heartbeat
  const fortnight = spanFor(Period.fortnight)
  const marks = releaseMarksIn(fortnight)
  const outages = incidents(monitor)
  const rules = ALERTS.filter((alert) => alert.project === monitor.projectName && alert.uptime)
  const peak = Math.max(0, ...monitor.checks.map((check) => check.responseTime ?? 0))
  const [allChecks, setAllChecks] = useState(false)
  const facts: [string, string | null | undefined][] = [
    ['Type', monitor.monitorType],
    [heartbeat ? 'Expected every' : 'Checked every', every(monitor.interval)],
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
        <Back to="uptime-monitors">Monitors</Back>
        <span className="truncate text-sm font-medium max-lg:hidden">{monitor.name}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button asChild size="sm" className="max-lg:h-9">
            <PLink to={`uptime-monitors/${monitor.id}/update`}>Edit</PLink>
          </Button>
          <Button size="sm" variant="destructive" className="max-lg:h-9" onClick={saved}>
            Delete
          </Button>
        </div>
      </PageBar>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-6 px-3 py-5 md:px-5">
          <header className="grid gap-x-6 gap-y-4 border-b pb-5 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <h1 className={cn('flex items-center gap-3 text-[1.625rem] leading-tight font-semibold', state === State.down && 'text-destructive')}>
                <StateGlyph state={state} className="size-4" />
                {state === State.waiting ? stateLine(monitor) : `${state === State.down ? 'Down' : 'Up'} for ${monitor.lastChange ? span(NOW - Date.parse(monitor.lastChange)) : ''}`}
              </h1>
              <p className="mt-1.5 font-medium">
                <span className="lg:hidden">{monitor.name}</span>
                {state === State.down && (
                  <span className="max-lg:before:content-['_·_']">
                    {heartbeat ? 'No heartbeat' : REASONS[outages[0]?.reason ?? 0]} since {clockTime(outages[0]?.from ?? NOW)}
                  </span>
                )}
              </p>
              {!heartbeat && <p className="mono mt-1.5 break-all text-muted-foreground">{monitor.url}</p>}
            </div>
            <dl className="flex gap-7 sm:self-end">
              <Stat label="24h" value={percent(uptime(monitor, spanFor(Period.day))) || 'no data'} />
              <Stat label="14d" value={percent(uptime(monitor, fortnight)) || 'no data'} />
              {!heartbeat && <Stat label="Response" value={responseText(responseNow(monitor)) || 'no data'} />}
            </dl>
          </header>

          {heartbeat ? (
            <Section label="Heartbeat address" action={<Button size="sm" onClick={() => notify('Copied')}>Copy</Button>}>
              <p className="mono mt-3 overflow-x-auto border bg-code px-3 py-2.5 whitespace-nowrap">{monitor.heartbeatEndpoint}</p>
            </Section>
          ) : (
            <Section label="Response, last 60 checks" action={<span className="mono text-muted-foreground">peak {responseText(peak)} · limit {monitor.timeout}s</span>}>
              <ResponseBars checks={monitor.checks} height={96} className="mt-3" />
              <p className="mono mt-1 flex justify-between text-muted-foreground">
                <span>{monitor.checks.at(-1) && clockTime(monitor.checks.at(-1)!.startCheck)}</span>
                <span>Now</span>
              </p>
            </Section>
          )}

          <Section label="Down, last 14 days" count={outages.length}>
            <MarkLabels marks={marks} className="mt-2" />
            <Band monitor={monitor} range={fortnight} marks={marks} height={28} />
            <ul className="mt-3">
              {outages.map((outage) => (
                <li key={outage.from} className="grid min-h-9 grid-cols-[112px_48px_minmax(0,1fr)] items-center gap-3 border-b py-1 first:border-t">
                  <time className="mono text-muted-foreground">{stampTime(outage.from)}</time>
                  <span className={cn('mono font-semibold', outage.ongoing && 'text-destructive')}>{span(outage.to - outage.from)}</span>
                  <span>
                    {heartbeat ? 'No heartbeat' : REASONS[outage.reason]}
                    {outage.ongoing && <span className="text-destructive"> · still down</span>}
                  </span>
                </li>
              ))}
            </ul>
            {outages.length === 0 && <p className="py-3 text-muted-foreground">No downtime in the last 14 days.</p>}
          </Section>

          <Section label="Checks">
            <ul>
              {monitor.checks.slice(0, allChecks ? 60 : 6).map((check) => (
                <li key={check.startCheck} className="grid min-h-9 grid-cols-[120px_minmax(0,1fr)_72px] items-center gap-3 border-b">
                  <time className="mono text-muted-foreground">{stampTime(check.startCheck)}</time>
                  <span className="flex items-center gap-2">
                    <StateGlyph state={check.isUp ? State.up : State.down} />
                    <span className={cn('truncate', !check.isUp && 'text-destructive')}>{check.isUp ? 'Up' : REASONS[check.reason ?? 0]}</span>
                  </span>
                  <span className="mono text-right">{responseText(check.responseTime)}</span>
                </li>
              ))}
            </ul>
            {monitor.checks.length === 0 && <p className="py-3 text-muted-foreground">No checks yet.</p>}
            {!allChecks && monitor.checks.length > 6 && (
              <Button size="sm" className="mt-3 max-lg:h-11" onClick={() => setAllChecks(true)}>
                Older checks
              </Button>
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-6 px-3 py-5 md:px-5 xl:border-l xl:px-4">
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
                  <PLink to="alerts" search={{ project: rule.project, alert: String(rule.id) }} className="block py-2 hover:bg-accent/60">
                    <span className="block font-medium">{rule.name}</span>
                    <span className="block text-sm text-muted-foreground">{rule.alertRecipients.map((recipient) => recipientMeta(recipient).label).join(', ')}</span>
                  </PLink>
                </li>
              ))}
            </ul>
            {rules.length === 0 && (
              <p className="py-3 text-muted-foreground">
                Nobody is told when this goes down.{' '}
                {monitor.projectName ? (
                  <PLink to="alerts" search={{ project: monitor.projectName, alert: 'new' }} className="text-brand hover:underline">
                    Add a rule
                  </PLink>
                ) : (
                  <PLink to={`uptime-monitors/${monitor.id}/update`} className="text-brand hover:underline">
                    Link a project
                  </PLink>
                )}
              </p>
            )}
          </Section>
        </div>
      </div>
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

// A form sheet: the group name on the left, its fields on the right.
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-x-6 gap-y-3 border-b py-5 lg:grid-cols-[140px_minmax(0,1fr)]">
      <legend className="label-caps float-left lg:pt-1">{label}</legend>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </fieldset>
  )
}

function MonitorForm({ monitor, draft, setDraft }: { monitor?: Monitor; draft: Draft; setDraft: (update: (current: Draft) => Draft) => void }) {
  const { go } = useProto()
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const back = monitor ? `uptime-monitors/${monitor.id}` : 'uptime-monitors'
  const heartbeat = draft.type === MonitorType.heartbeat
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        saved()
        go(back)
      }}
    >
      <PageBar>
        <Back to={back}>{monitor ? monitor.name : 'Monitors'}</Back>
        <span className="truncate text-sm font-medium max-lg:hidden">{monitor ? `Edit ${monitor.name}` : 'New monitor'}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button asChild size="sm" className="max-lg:h-9">
            <PLink to={back}>Cancel</PLink>
          </Button>
          <Button type="submit" variant="default" size="sm" className="max-lg:h-9">
            {monitor ? 'Save' : 'Create monitor'}
          </Button>
        </div>
      </PageBar>
      <div className="max-w-3xl px-3 pb-10 md:px-5">
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
                  'flex h-16 flex-col items-center justify-center gap-1.5 border-r text-sm font-medium last:border-r-0',
                  draft.type === tile.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <tile.icon className="size-4" strokeWidth={1.8} />
                {tile.label}
              </button>
            ))}
          </div>
          {!heartbeat && (
            <Field label={targetLabel(draft.type)}>
              {(id) => <Input id={id} className="font-mono" value={draft.url} placeholder={targetPlaceholder(draft.type)} onChange={(event) => set('url', event.target.value)} required />}
            </Field>
          )}
          <Field label="Name">{(id) => <Input id={id} value={draft.name} onChange={(event) => set('name', event.target.value)} required />}</Field>
        </Group>
        {isHttp(draft.type) && (
          <Group label="Expect">
            <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
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
    </form>
  )
}

function StatusPagePane({ page }: { page: StatusPage }) {
  const { org } = useProto()
  const monitors = downFirst(page.monitors.flatMap((id) => monitorById(id) ?? []))
  const down = monitors.filter((monitor) => stateOf(monitor) === State.down).length
  const fortnight = spanFor(Period.fortnight)
  return (
    <>
      <PageBar>
        <Back to="uptime-monitors">Monitors</Back>
        <span className="truncate text-sm font-medium">{page.name}</span>
        <span className="mono shrink-0 text-muted-foreground">{page.isPublic ? 'anyone with the link' : 'members only'}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2 max-lg:hidden">
          <Button asChild size="sm">
            <a href="/admin/uptime/statuspage/" target="_blank" rel="noreferrer">
              Edit in admin
              <ExternalLink />
            </a>
          </Button>
          <Button asChild size="sm" variant="default">
            <a href={`/status-pages/${org}/${page.slug}/`} target="_blank" rel="noreferrer">
              Open page
              <ExternalLink />
            </a>
          </Button>
        </div>
      </PageBar>
      <div className="px-3 py-5 md:px-5">
        <p className="mono mb-4 truncate text-muted-foreground">
          /status-pages/{org}/{page.slug}/
        </p>
        <div className="max-w-2xl border bg-card">
          <header className="border-b px-4 py-4">
            <h1 className="text-xl font-semibold">{page.name}</h1>
            {monitors.length > 0 && <p className={cn('mt-1 font-medium', down ? 'text-destructive' : 'text-ok')}>{down ? `${down} of ${monitors.length} down` : 'Everything is up'}</p>}
          </header>
          {monitors.length === 0 && <p className="px-4 py-6 text-muted-foreground">No monitors on this page yet.</p>}
          <ul>
            {monitors.map((monitor) => (
              <li key={monitor.id} className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-x-4 gap-y-2 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_72px]">
                <span className="flex items-center gap-2">
                  <StateGlyph state={stateOf(monitor)} />
                  <span className="truncate font-medium">{monitor.name}</span>
                </span>
                <Band monitor={monitor} range={fortnight} height={18} className="max-sm:order-3 max-sm:col-span-2" />
                <span className="mono text-right">{percent(uptime(monitor, fortnight))}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
          <Button asChild variant="default" size="touch">
            <a href={`/status-pages/${org}/${page.slug}/`} target="_blank" rel="noreferrer">
              Open page
              <ExternalLink />
            </a>
          </Button>
          <Button asChild size="touch">
            <a href="/admin/uptime/statuspage/" target="_blank" rel="noreferrer">
              Edit in admin
              <ExternalLink />
            </a>
          </Button>
        </div>
      </div>
    </>
  )
}

const destinationKey = (recipient: Recipient) => `${recipient.recipientType} ${recipient.url ?? ''}`

function Alerts({ project, alert, base }: Extract<ScreenProps, { screen: 'alerts' }>) {
  const { go } = useProto()
  const stock = base.to !== 'alerts'
  const slug = project ?? PROJECTS[0]!
  const [rules, setRules] = useState<Alert[]>(ALERTS)
  const [extra, setExtra] = useState<Recipient[]>([])
  const mine = rules.filter((rule) => rule.project === slug)
  const destinations = [...mine.flatMap((rule) => rule.alertRecipients), ...extra].filter((recipient, index, all) => all.findIndex((other) => destinationKey(other) === destinationKey(recipient)) === index)
  const open = (id?: string) => go(base.to, { ...base.search, project: stock ? undefined : slug, alert: id })
  const toggle = (rule: Alert, destination: Recipient) =>
    setRules((current) =>
      current.map((candidate) => {
        if (candidate.id !== rule.id) return candidate
        const has = candidate.alertRecipients.some((recipient) => destinationKey(recipient) === destinationKey(destination))
        return { ...candidate, alertRecipients: has ? candidate.alertRecipients.filter((recipient) => destinationKey(recipient) !== destinationKey(destination)) : [...candidate.alertRecipients, destination] }
      }),
    )
  const sends = (rule: Alert, destination: Recipient) => rule.alertRecipients.some((recipient) => destinationKey(recipient) === destinationKey(destination))
  const blank: Alert = { id: 0, project: slug, name: '', quantity: 10, timespanMinutes: 5, uptime: false, environments: [], alertRecipients: [] }
  const shown = alert === 'new' ? [...mine, blank] : mine

  const list = (
    <>
      <PageBar>
        <span className="text-sm font-medium">Alerts</span>
      </PageBar>
      <ul>
        {PROJECTS.map((item) => {
          const count = rules.filter((rule) => rule.project === item).length
          return (
            <li key={item}>
              <PLink to="alerts" search={{ project: item }} className={cn(rowClass(Boolean(project) && item === slug), 'flex min-h-11 items-center gap-2')}>
                <span className="mono min-w-0 flex-1 truncate font-semibold">{item}</span>
                <span className="text-sm text-muted-foreground">{count ? `${count} ${count === 1 ? 'rule' : 'rules'}` : 'no rules'}</span>
              </PLink>
            </li>
          )
        })}
      </ul>
    </>
  )

  return (
    <Split list={list} picked={Boolean(project)}>
      <PageBar>
        {!stock && <Back to="alerts">Alerts</Back>}
        <span className="mono truncate font-semibold">{slug}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <AddDestination onAdd={(recipient) => setExtra((current) => [...current, recipient])} />
          <Button variant="default" size="sm" className="max-lg:h-9" onClick={() => open('new')}>
            New rule
          </Button>
        </div>
      </PageBar>

      {shown.length === 0 && <p className="px-3 py-6 text-muted-foreground md:px-5">No rules for this project.</p>}

      <div className="overflow-x-auto max-lg:hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b align-bottom">
              <th className="label-caps h-14 px-5 pb-2 text-left font-normal">Rule</th>
              {destinations.map((destination) => {
                const meta = recipientMeta(destination)
                return (
                  <th key={destinationKey(destination)} className="w-[132px] max-w-[132px] border-l px-2 pb-2 text-left font-normal" title={destination.url || undefined}>
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <meta.icon className="size-3.5 text-muted-foreground" />
                      {meta.label}
                    </span>
                    <span className="mono block truncate text-xs text-muted-foreground">{recipientTarget(destination)}</span>
                  </th>
                )
              })}
              <th className="border-l" />
            </tr>
          </thead>
          <tbody>
            {shown.map((rule) => {
              const editing = alert === String(rule.id) || (alert === 'new' && rule.id === 0)
              return (
                <RuleRows key={rule.id} rule={rule} editing={editing} span={destinations.length + 2} onOpen={() => open(editing ? undefined : String(rule.id))}>
                  {destinations.map((destination) => (
                    <td key={destinationKey(destination)} className="border-l text-center">
                      <Checkbox hit checked={sends(rule, destination)} onCheckedChange={() => toggle(rule, destination)} aria-label={`${rule.name}: tell ${recipientMeta(destination).label}`} className="mx-auto" />
                    </td>
                  ))}
                </RuleRows>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="lg:hidden">
        {shown.map((rule) => {
          const editing = alert === String(rule.id) || (alert === 'new' && rule.id === 0)
          return (
            <li key={rule.id} className="border-b">
              <button type="button" onClick={() => open(editing ? undefined : String(rule.id))} className="block w-full px-3 pt-3 pb-1 text-left" aria-expanded={editing}>
                <span className="block font-medium">{rule.name || 'New rule'}</span>
                <span className="block text-muted-foreground">
                  {conditions(rule).join(', or ')}
                  {rule.environments.length > 0 && ` · ${rule.environments.join(', ')}`}
                </span>
              </button>
              {editing && <RuleEditor rule={rule} onClose={() => open(undefined)} />}
              <ul className="pb-1">
                {destinations.map((destination) => (
                  <li key={destinationKey(destination)}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-1 pr-3">
                      <Checkbox hit checked={sends(rule, destination)} onCheckedChange={() => toggle(rule, destination)} />
                      <span className="shrink-0">{recipientMeta(destination).label}</span>
                      <span className="mono ml-2 truncate text-muted-foreground">{recipientTarget(destination)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </Split>
  )
}

function RuleRows({ rule, editing, span: columns, onOpen, children }: { rule: Alert; editing: boolean; span: number; onOpen: () => void; children: ReactNode }) {
  return (
    <>
      <tr className={cn('border-b', editing ? 'bg-selected' : 'hover:bg-accent/60')}>
        <td className="p-0">
          <button type="button" onClick={onOpen} aria-expanded={editing} className="block w-full px-5 py-2 text-left">
            <span className="block font-medium">{rule.name || 'New rule'}</span>
            <span className="block text-sm text-muted-foreground">
              {conditions(rule).join(', or ')}
              {rule.environments.length > 0 && ` · ${rule.environments.join(', ')}`}
            </span>
          </button>
        </td>
        {children}
        <td className="border-l" />
      </tr>
      {editing && (
        <tr className="border-b bg-card">
          <td colSpan={columns} className="p-0">
            <RuleEditor rule={rule} onClose={onOpen} />
          </td>
        </tr>
      )}
    </>
  )
}

function RuleEditor({ rule, onClose }: { rule: Alert; onClose: () => void }) {
  const [events, setEvents] = useState(Boolean(rule.quantity))
  const [down, setDown] = useState(rule.uptime)
  const [environments, setEnvironments] = useState(rule.environments)
  const done = () => {
    saved()
    onClose()
  }
  return (
    <form
      className="flex flex-col gap-4 px-3 py-4 lg:max-w-2xl lg:px-5"
      onSubmit={(event) => {
        event.preventDefault()
        done()
      }}
    >
      <Field label="Name">{(id) => <Input id={id} defaultValue={rule.name ?? ''} autoFocus={!rule.id} required />}</Field>
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
                className={cn('mono h-8 border px-2.5 max-lg:h-11', on ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-accent')}
              >
                {name}
              </button>
            )
          })}
          {environments.length === 0 && <span className="text-sm text-muted-foreground">All</span>}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="default" className="max-lg:h-11" disabled={!events && !down}>
          {rule.id ? 'Save rule' : 'Create rule'}
        </Button>
        {rule.id ? (
          <>
            <Button className="max-lg:h-11" onClick={() => notify(`Test sent to ${rule.alertRecipients.length} ${rule.alertRecipients.length === 1 ? 'recipient' : 'recipients'}`)}>
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

function AddDestination({ onAdd }: { onAdd: (recipient: Recipient) => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<string>(RecipientType.webhook)
  const [url, setUrl] = useState('')
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className="max-lg:h-9">
          <Plus />
          Recipient
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            onAdd({ id: -Date.now(), recipientType: type, url })
            setOpen(false)
            setUrl('')
          }}
        >
          <Field label="Send to">
            {(id) => (
              <Select id={id} value={type} onChange={(event) => setType(event.target.value)}>
                {Object.entries(RECIPIENTS).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {type !== RecipientType.email && (
            <Field label="Address">{(id) => <Input id={id} className="font-mono" value={url} placeholder={RECIPIENTS[type as RecipientType].placeholder} onChange={(event) => setUrl(event.target.value)} required />}</Field>
          )}
          <Button type="submit" variant="default" className="max-lg:h-11">
            Add recipient
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

const RELEASE_TABS = ['issues', 'commits', 'deploys', 'files'] as const

function Releases({ release }: { release?: Release }) {
  const { params } = useProto()
  const picked = release ?? RELEASES[0]!
  const tab = RELEASE_TABS.find((key) => key === params.get('tab')) ?? 'issues'
  const issues = releaseIssues(picked.version)
  const commits = releaseCommits(picked)
  const deploys = releaseDeploys(picked)
  const files = releaseFiles(picked)
  const to = `releases/${encodeURIComponent(picked.version)}`

  const list = (
    <>
      <PageBar>
        <span className="text-sm font-medium">Releases</span>
        <span className="mono text-muted-foreground">{RELEASES.length}</span>
      </PageBar>
      <ul>
        {RELEASES.map((item) => {
          const fresh = releaseIssues(item.version).filter((issue) => issue.firstSeenHere).length
          return (
            <li key={item.version}>
              <PLink to={`releases/${encodeURIComponent(item.version)}`} className={rowClass(item.version === picked.version)}>
                <span className="flex items-baseline gap-3">
                  <span className="mono min-w-0 flex-1 truncate font-semibold">{item.shortVersion}</span>
                  <time className="mono shrink-0 text-muted-foreground">{ago(item.dateCreated, now)}</time>
                </span>
                <span className="mt-0.5 flex items-baseline gap-3">
                  <span className="mono min-w-0 flex-1 truncate text-muted-foreground">{item.projects.map((project) => project.slug).join(', ')}</span>
                  {fresh > 0 && <span className="mono shrink-0 text-trend-new">{fresh} new</span>}
                </span>
              </PLink>
            </li>
          )
        })}
      </ul>
    </>
  )

  return (
    <Split list={list} picked={Boolean(release)}>
      <PageBar>
        <Back to="releases">Releases</Back>
        <Tabs
          tabs={[
            { key: 'issues', label: 'Issues', count: issues.length },
            { key: 'commits', label: 'Commits', count: picked.commitCount },
            { key: 'deploys', label: 'Deploys', count: picked.deployCount },
            { key: 'files', label: 'Files', count: files.length },
          ]}
          current={tab}
          to={(key) => ({ to, search: { tab: key === 'issues' ? undefined : key } })}
          className="min-w-0 overflow-x-auto"
        />
      </PageBar>
      <div className="px-3 py-5 md:px-5">
        <h1 className="font-mono text-xl font-semibold break-all">{picked.version}</h1>
        <p className="mono mt-1.5 text-muted-foreground">
          {picked.projects.map((project) => project.slug).join(', ')} · {stampTime(picked.dateCreated)}
          {deploys[0] ? ` · live on ${deploys[0].environment}` : ' · not deployed'}
        </p>

        <ul className="mt-5 border-t">
          {tab === 'issues' &&
            issues.map((issue) => (
              <li key={issue.id} className="border-b">
                <a href={`../issues/${issue.id}`} className="grid grid-cols-[minmax(0,1fr)_56px] items-center gap-x-4 py-2 hover:bg-accent/60 lg:grid-cols-[minmax(0,1fr)_56px_56px_56px]">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <LevelGlyph level={issue.level} />
                      <span className="truncate">
                        <span className="font-mono text-[0.8125rem] font-semibold">{issue.type}</span> {issue.value}
                      </span>
                    </span>
                    <span className="mono block pl-[18px] text-muted-foreground">{issue.shortId}</span>
                  </span>
                  <span className={cn('label-caps text-right', issue.firstSeenHere ? 'text-trend-new' : 'invisible')}>New</span>
                  <span className="mono text-right max-lg:hidden">{compact(issue.count)}</span>
                  <time className="mono text-right text-muted-foreground max-lg:hidden">{ago(issue.lastSeen, now)}</time>
                </a>
              </li>
            ))}
          {tab === 'commits' &&
            commits.map((commit) => (
              <li key={commit.id} className="grid min-h-9 grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 border-b py-1.5">
                <span className="mono text-muted-foreground">{commit.id.slice(0, 7)}</span>
                <span className="truncate max-lg:whitespace-normal">{commit.message}</span>
                <span className="mono text-muted-foreground max-lg:hidden">{commit.authorName}</span>
              </li>
            ))}
          {tab === 'deploys' &&
            deploys.map((deploy) => (
              <li key={deploy.id} className="grid min-h-9 grid-cols-[112px_minmax(0,1fr)_auto] items-center gap-4 border-b">
                <span className="mono font-semibold">{deploy.environment}</span>
                <span className="mono truncate text-muted-foreground">{deploy.url}</span>
                <time className="mono text-muted-foreground">{stampTime(deploy.dateCreated)}</time>
              </li>
            ))}
          {tab === 'files' &&
            files.map((file) => (
              <li key={file.id} className="grid min-h-9 grid-cols-[minmax(0,1fr)_72px_auto] items-center gap-3 border-b max-lg:min-h-11">
                <span className="mono truncate">{file.name}</span>
                <span className="mono text-right text-muted-foreground">{bytes(file.size)}</span>
                <Button size="sm" variant="destructive" onClick={saved} className="max-lg:h-9">
                  Delete
                </Button>
              </li>
            ))}
        </ul>
        {{ issues: issues.length, commits: commits.length, deploys: deploys.length, files: files.length }[tab] === 0 && (
          <p className="py-4 text-muted-foreground">
            {{ issues: 'No errors reported from this release.', commits: 'No commits were sent with this release.', deploys: 'Not deployed anywhere yet.', files: 'No source maps uploaded.' }[tab]}
          </p>
        )}
      </div>
    </Split>
  )
}
