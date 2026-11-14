// PROTOTYPE, throwaway. Variant A, "Ledger": monitors are rows on one shared time axis, like the inbox.
// A monitor is created on its own page (the stock /new route); an alert rule is edited in a dialog over the list.
import { ExternalLink, Globe, Lock, Plus, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ago, compact, dayLabel, exact } from '@/features/issues/format'
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
  type Recipient,
  type Release,
} from './data'
import type { ScreenProps } from './index'
import {
  AxisEnds,
  Band,
  Bars,
  Field,
  INTERVALS,
  MarkLabels,
  PLink,
  RECIPIENTS,
  RecipientChip,
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
  releaseMarksIn,
  responseText,
  stampTime,
  stateLine,
  target,
  targetLabel,
  targetPlaceholder,
  useProto,
} from './shared'

const saved = () => notify('Prototype: nothing was saved')

export function VariantA(props: ScreenProps) {
  switch (props.screen) {
    case 'uptime':
      return <UptimeList />
    case 'monitor':
      return <MonitorPage monitor={props.monitor} tab={props.tab} />
    case 'monitor-form':
      return <MonitorForm monitor={props.monitor} />
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
  { key: 'uptime-monitors', label: 'Monitors', count: MONITORS.length },
  { key: 'uptime-monitors/status-pages', label: 'Status pages', count: STATUS_PAGES.length },
]

const COLUMNS = 'lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_80px_208px_72px]'
const GROUPS = [
  { state: State.down, label: 'Down', color: 'text-destructive' },
  { state: State.up, label: 'Up', color: 'text-muted-foreground' },
  { state: State.waiting, label: 'Waiting for a first check', color: 'text-muted-foreground' },
]

function UptimeList() {
  const { params, go } = useProto()
  const period = params.get('period') === Period.fortnight ? Period.fortnight : Period.day
  const range = spanFor(period)
  const marks = releaseMarksIn(range)
  const down = MONITORS.filter((monitor) => stateOf(monitor) === State.down).length
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
          <span className={down ? 'text-destructive' : 'text-ok'}>
            <span className="mono font-semibold">{down}</span> down
          </span>
        </p>
        <MarkLabels marks={marks} className="max-lg:hidden lg:mx-4" />
      </div>
      <div className={cn('sticky top-11 z-10 grid h-8 items-center border-b bg-background px-4 max-lg:hidden', COLUMNS)}>
        <span className="label-caps">Monitor</span>
        <AxisEnds period={period} className="mx-4" />
        <span className="label-caps text-right">Uptime</span>
        <span className="label-caps text-right">Response / limit</span>
        <span className="label-caps text-right">Changed</span>
      </div>

      {GROUPS.map((group) => {
        const rows = MONITORS.filter((monitor) => stateOf(monitor) === group.state)
        if (!rows.length) return null
        return (
          <section key={group.state}>
            <h2 className={cn('label-caps flex h-8 items-center gap-2 border-b bg-muted/60 px-3 font-semibold lg:px-4', group.color)}>
              {group.label}
              <span className="font-normal text-muted-foreground">{rows.length}</span>
            </h2>
            <ul>
              {rows.map((monitor) => (
                <li key={monitor.id} className="border-b">
                  <PLink
                    to={`uptime-monitors/${monitor.id}`}
                    className={cn('grid grid-cols-[minmax(0,1fr)_96px] items-center gap-x-3 px-3 py-2.5 transition-colors duration-100 hover:bg-accent/60 lg:gap-x-0 lg:px-4 lg:py-2', COLUMNS)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StateGlyph state={stateOf(monitor)} />
                        <span className="truncate font-medium">{monitor.name}</span>
                      </div>
                      <div className="mono mt-0.5 flex gap-2 pl-[18px] text-muted-foreground">
                        {group.state === State.down && <span className="shrink-0 text-destructive max-lg:hidden">{REASONS[incidents(monitor)[0]?.reason ?? 0]}</span>}
                        <span className="truncate max-lg:hidden">{target(monitor)}</span>
                        <span className={cn('truncate lg:hidden', group.state === State.down && 'text-destructive')}>
                          {stateLine(monitor)}
                          {group.state === State.up && responseNow(monitor) !== undefined && ` · ${responseText(responseNow(monitor))}`}
                        </span>
                      </div>
                    </div>
                    <Band monitor={monitor} range={range} marks={marks} className="lg:mx-4" />
                    <span className="mono text-right max-lg:hidden">{percent(uptime(monitor, range))}</span>
                    <span className="flex items-center justify-end gap-3 max-lg:hidden">
                      {monitor.monitorType !== MonitorType.heartbeat && monitor.checks.length > 0 && (
                        <ResponseBars checks={monitor.checks.slice(0, 30)} timeout={monitor.timeout} height={18} className="w-[88px]" />
                      )}
                      <span className="mono w-14 text-right">{responseText(responseNow(monitor))}</span>
                    </span>
                    <time className="mono text-right text-muted-foreground max-lg:hidden" title={monitor.lastChange ? exact(monitor.lastChange) : undefined}>
                      {monitor.lastChange && monitor.isUp !== null ? ago(monitor.lastChange, new Date(NOW)) : ''}
                    </time>
                  </PLink>
                </li>
              ))}
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

const MONITOR_TABS = ['overview', 'checks', 'alerts'] as const

function MonitorPage({ monitor, tab }: { monitor: Monitor; tab: string }) {
  const { go } = useProto()
  const [confirming, setConfirming] = useState(false)
  const current = MONITOR_TABS.find((key) => key === tab) ?? 'overview'
  const rules = ALERTS.filter((alert) => alert.project === monitor.projectName && alert.uptime)
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'checks', label: 'Checks' },
    { key: 'alerts', label: 'Alerts', count: rules.length },
  ]
  const state = stateOf(monitor)
  return (
    <>
      <PageBar>
        <Crumbs root="Uptime" rootTo="uptime-monitors">
          {monitor.name}
        </Crumbs>
        <Tabs tabs={tabs} current={current} to={(key) => ({ to: `uptime-monitors/${monitor.id}`, search: { tab: key === 'overview' ? undefined : key } })} className="ml-4 max-lg:hidden" />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button asChild size="sm" className="max-lg:h-9">
            <PLink to={`uptime-monitors/${monitor.id}/update`}>Edit</PLink>
          </Button>
          <Button size="sm" variant="destructive" className="max-lg:h-9" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        </div>
      </PageBar>
      <div className="flex h-11 border-b px-3 lg:hidden">
        <Tabs tabs={tabs} current={current} to={(key) => ({ to: `uptime-monitors/${monitor.id}`, search: { tab: key === 'overview' ? undefined : key } })} />
      </div>

      <div className="mx-auto w-full max-w-5xl px-3 pb-16 md:px-4">
        <header className="py-5">
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold">
            <StateGlyph state={state} className="size-3.5" />
            {monitor.name}
          </h1>
          <p className={cn('mt-1 font-medium', state === State.down ? 'text-destructive' : 'text-muted-foreground')}>{stateLine(monitor)}</p>
          {monitor.monitorType !== MonitorType.heartbeat && (
            <p className="mono mt-2 break-all text-muted-foreground">
              {monitor.monitorType} {monitor.url}
            </p>
          )}
        </header>

        {current === 'overview' && <Overview monitor={monitor} />}
        {current === 'checks' && <Checks monitor={monitor} />}
        {current === 'alerts' && (
          <Section label="Tells someone when this goes down" count={rules.length}>
            {rules.length ? (
              <ul>
                {rules.map((rule) => (
                  <li key={rule.id} className="border-b">
                    <PLink to="alerts" search={{ alert: String(rule.id), project: rule.project }} className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 py-2 hover:bg-accent/60">
                      <span className="font-medium">{rule.name}</span>
                      <span className="flex flex-wrap gap-x-3">
                        {rule.alertRecipients.map((recipient) => (
                          <RecipientChip key={recipient.id} recipient={recipient} />
                        ))}
                      </span>
                    </PLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex flex-wrap items-center gap-3 py-4 text-muted-foreground">
                {monitor.projectName ? 'No rule covers this monitor.' : 'Link a project to send alerts for this monitor.'}
                <Button asChild size="sm">
                  {monitor.projectName ? (
                    <PLink to="alerts" search={{ alert: 'new', project: monitor.projectName }}>
                      Add a downtime rule
                    </PLink>
                  ) : (
                    <PLink to={`uptime-monitors/${monitor.id}/update`}>Edit monitor</PLink>
                  )}
                </Button>
              </p>
            )}
          </Section>
        )}
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

function Overview({ monitor }: { monitor: Monitor }) {
  const fortnight = spanFor(Period.fortnight)
  const marks = releaseMarksIn(fortnight)
  const heartbeat = monitor.monitorType === MonitorType.heartbeat
  const peak = Math.max(0, ...monitor.checks.map((check) => check.responseTime ?? 0))
  const facts: [string, string | null | undefined][] = [
    ['Status', isHttp(monitor.monitorType) ? String(monitor.expectedStatus ?? '') : null],
    ['Text', monitor.expectedBody || null],
    ['Timeout', monitor.timeout ? `${monitor.timeout}s` : null],
    ['Down after', `${monitor.confirmationThreshold} failed ${monitor.confirmationThreshold === 1 ? 'check' : 'checks'}`],
    ['Project', monitor.projectName],
    ['Environment', monitor.envName],
  ]
  return (
    <div className="flex flex-col gap-7">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-y py-4 lg:grid-cols-4">
        <Stat label="Uptime 24h" value={percent(uptime(monitor, spanFor(Period.day))) || 'No data'} />
        <Stat label="Uptime 14d" value={percent(uptime(monitor, fortnight)) || 'No data'} />
        <Stat label={heartbeat ? 'Last heartbeat' : 'Response'} value={heartbeat ? (monitor.checks[0] ? `${ago(monitor.checks[0].startCheck, new Date(NOW))} ago` : 'None') : responseText(responseNow(monitor)) || 'No data'} />
        <Stat label={heartbeat ? 'Expected every' : 'Checked every'} value={every(monitor.interval)} />
      </dl>

      <Section label="Downtime, 14 days" count={incidents(monitor).length}>
        <div className="pt-3">
          <MarkLabels marks={marks} />
          <Band monitor={monitor} range={fortnight} marks={marks} height={40} />
          <p className="mono mt-1 flex justify-between text-muted-foreground">
            <span>{dayLabel(fortnight.from / 1000)}</span>
            <span>Now</span>
          </p>
        </div>
      </Section>

      {heartbeat ? (
        <Section label="Heartbeat address">
          <p className="mono mt-3 overflow-x-auto border bg-code px-3 py-2.5 whitespace-nowrap">{monitor.heartbeatEndpoint}</p>
          <Button size="sm" className="mt-2" onClick={() => notify('Copied')}>
            Copy
          </Button>
        </Section>
      ) : (
        <Section label="Response, last 60 checks" action={<span className="mono text-muted-foreground">peak {responseText(peak)} · limit {monitor.timeout}s</span>}>
          <div>
            <ResponseBars checks={monitor.checks} height={72} className="mt-3" />
            <p className="mono mt-1 flex justify-between text-muted-foreground">
              <span>{monitor.checks.at(-1) && clockTime(monitor.checks.at(-1)!.startCheck)}</span>
              <span>Now</span>
            </p>
          </div>
        </Section>
      )}

      <Section label="Expects">
        <dl className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
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
    </div>
  )
}

function Checks({ monitor }: { monitor: Monitor }) {
  const [changesOnly, setChangesOnly] = useState(false)
  const rows = changesOnly ? monitor.changes : monitor.checks.slice(0, 25)
  return (
    <Section
      label="Checks"
      action={
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox checked={changesOnly} onCheckedChange={(checked) => setChangesOnly(checked === true)} />
          Changes only
        </label>
      }
    >
      <ul>
        {rows.map((check) => (
          <li key={check.startCheck} className="grid min-h-9 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_64px] items-center gap-3 border-b lg:grid-cols-[200px_minmax(0,1fr)_96px]">
            <time className="mono text-muted-foreground">{stampTime(check.startCheck)}</time>
            <span className="flex items-center gap-2">
              <StateGlyph state={check.isUp ? State.up : State.down} />
              <span className={cn('truncate', !check.isUp && 'text-destructive')}>{check.isUp ? 'Up' : REASONS[check.reason ?? 0]}</span>
            </span>
            <span className="mono text-right">{responseText(check.responseTime)}</span>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="py-4 text-muted-foreground">{changesOnly ? 'This monitor has never changed state.' : 'No checks yet.'}</p>}
      {!changesOnly && rows.length > 0 && (
        <Button size="sm" className="mt-3 max-lg:h-11">
          Older checks
        </Button>
      )}
    </Section>
  )
}

function MonitorForm({ monitor }: { monitor?: Monitor }) {
  const { go } = useProto()
  const [draft, setDraft] = useState(() => draftFrom(monitor))
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const back = monitor ? `uptime-monitors/${monitor.id}` : 'uptime-monitors'
  const heartbeat = draft.type === MonitorType.heartbeat
  return (
    <>
      <PageBar>
        <Crumbs root="Uptime" rootTo="uptime-monitors">
          {monitor ? `Edit ${monitor.name}` : 'New monitor'}
        </Crumbs>
      </PageBar>
      <form
        className="mx-auto flex w-full max-w-xl flex-col gap-5 px-3 py-6 md:px-4"
        onSubmit={(event) => {
          event.preventDefault()
          saved()
          go(back)
        }}
      >
        <Field label="Type">{() => <Segmented label="Type" value={draft.type} options={TYPE_OPTIONS} onChange={(value) => set('type', value)} />}</Field>
        <Field label="Name">{(id) => <Input id={id} value={draft.name} onChange={(event) => set('name', event.target.value)} required />}</Field>
        {!heartbeat && (
          <Field label={targetLabel(draft.type)}>
            {(id) => <Input id={id} className="font-mono" value={draft.url} placeholder={targetPlaceholder(draft.type)} onChange={(event) => set('url', event.target.value)} required />}
          </Field>
        )}
        {isHttp(draft.type) && (
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
            <Field label="Status">{(id) => <Input id={id} inputMode="numeric" className="font-mono" value={draft.status} onChange={(event) => set('status', event.target.value)} />}</Field>
            <Field label="Page contains">{(id) => <Input id={id} value={draft.body} onChange={(event) => set('body', event.target.value)} />}</Field>
          </div>
        )}
        <div className={cn('grid gap-3', heartbeat ? 'grid-cols-1' : 'grid-cols-3')}>
          <Field label={heartbeat ? 'Expect one every' : 'Check every'}>
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
                        {count} {count === 1 ? 'failure' : 'failures'}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </>
          )}
        </div>
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
        <div className="flex gap-2 border-t pt-4">
          <Button type="submit" variant="default" className="max-lg:h-11">
            {monitor ? 'Save monitor' : 'Create monitor'}
          </Button>
          <Button asChild className="max-lg:h-11">
            <PLink to={back}>Cancel</PLink>
          </Button>
        </div>
      </form>
    </>
  )
}

function StatusPages() {
  const { org } = useProto()
  const [creating, setCreating] = useState(false)
  return (
    <>
      <PageBar>
        <Tabs tabs={UPTIME_TABS} current="uptime-monitors/status-pages" to={(key) => ({ to: key })} />
        <Button variant="default" size="sm" className="ml-auto max-lg:h-9" onClick={() => setCreating(true)}>
          New status page
        </Button>
      </PageBar>
      <div className="grid h-8 grid-cols-[minmax(0,3fr)_96px_minmax(0,3fr)_120px] items-center border-b px-4 max-lg:hidden">
        <span className="label-caps">Page</span>
        <span className="label-caps">Seen by</span>
        <span className="label-caps">Monitors</span>
        <span />
      </div>
      <ul>
        {STATUS_PAGES.map((page) => {
          const monitors = downFirst(page.monitors.flatMap((id) => monitorById(id) ?? []))
          const down = monitors.filter((monitor) => stateOf(monitor) === State.down).length
          const Visibility = page.isPublic ? Globe : Lock
          return (
            <li key={page.slug} className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b px-3 py-2.5 hover:bg-accent/60 lg:grid-cols-[minmax(0,3fr)_96px_minmax(0,3fr)_120px] lg:px-4 lg:py-2">
              <div className="min-w-0">
                <a href={`/status-pages/${org}/${page.slug}/`} target="_blank" rel="noreferrer" className="font-medium after:absolute after:inset-0">
                  {page.name}
                </a>
                <p className="mono truncate text-muted-foreground">
                  /status-pages/{org}/{page.slug}/
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-sm">
                <Visibility className="size-3.5 text-muted-foreground" />
                {page.isPublic ? 'Anyone' : 'Members'}
              </span>
              <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 max-lg:col-span-2">
                {monitors.length === 0 && <span className="text-muted-foreground">No monitors</span>}
                {monitors.slice(0, 4).map((monitor) => (
                  <span key={monitor.id} className="flex items-center gap-1.5 text-sm">
                    <StateGlyph state={stateOf(monitor)} />
                    {monitor.name}
                  </span>
                ))}
                {down > 0 && <span className="sr-only">{down} down</span>}
              </span>
              <a href="/admin/uptime/statuspage/" target="_blank" rel="noreferrer" className="relative z-10 flex items-center gap-1.5 justify-self-end text-sm text-brand hover:underline max-lg:col-span-2 max-lg:min-h-11 max-lg:justify-self-start">
                Edit in admin
                <ExternalLink className="size-3.5" />
              </a>
            </li>
          )
        })}
      </ul>
      <NewStatusPage open={creating} onClose={() => setCreating(false)} />
    </>
  )
}

export function NewStatusPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [isPublic, setIsPublic] = useState(true)
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined} className="p-4">
        <DialogTitle>New status page</DialogTitle>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            saved()
            onClose()
          }}
        >
          <Field label="Name">{(id) => <Input id={id} autoFocus required />}</Field>
          <label className="flex min-h-9 cursor-pointer items-center gap-2.5 max-lg:min-h-11">
            <Checkbox checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked === true)} />
            Anyone with the link can see it
          </label>
          <p className="text-sm text-muted-foreground">Monitors are added to the page in the admin, and this choice can only be changed there.</p>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button>Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="default">
              Create status page
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
          <section key={slug}>
            <h2 className="label-caps flex h-8 items-center gap-2 border-b bg-muted/60 px-3 font-semibold tracking-normal normal-case lg:px-4">
              {slug}
              <span className="font-normal">{rules.length}</span>
            </h2>
            {rules.length === 0 && (
              <p className="flex min-h-11 items-center gap-3 border-b px-3 text-muted-foreground lg:px-4">
                No rules.
                <button type="button" className="text-brand hover:underline" onClick={() => open('new', slug)}>
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
      {alert && <AlertDialog key={alert} rule={editing} project={editing?.project ?? project ?? PROJECTS[0]!} fixedProject={Boolean(editing)} onClose={() => open(undefined)} />}
    </>
  )
}

function AlertDialog({ rule, project, fixedProject, onClose }: { rule?: Alert; project: string; fixedProject: boolean; onClose: () => void }) {
  const [events, setEvents] = useState(rule ? Boolean(rule.quantity) : true)
  const [down, setDown] = useState(rule?.uptime ?? false)
  const [environments, setEnvironments] = useState(rule?.environments ?? [])
  const [recipients, setRecipients] = useState<Recipient[]>(rule?.alertRecipients ?? [{ id: -1, recipientType: RecipientType.email, url: '' }])
  const hasEmail = recipients.some((recipient) => recipient.recipientType === RecipientType.email)
  const change = (index: number, patch: Partial<Recipient>) => setRecipients((current) => current.map((recipient, at) => (at === index ? { ...recipient, ...patch } : recipient)))
  const done = () => {
    saved()
    onClose()
  }
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined} onOpenAutoFocus={(event) => event.preventDefault()} className="top-[6vh] flex max-h-[88vh] max-w-xl flex-col">
        <div className="flex h-11 shrink-0 items-center justify-between border-b px-4">
          <DialogTitle className="text-base">{rule ? 'Edit rule' : 'New rule'}</DialogTitle>
          <DialogClose aria-label="Close" className="grid size-8 place-items-center hover:bg-accent">
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
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <Field label="Name">{(id) => <Input id={id} defaultValue={rule?.name ?? ''} required />}</Field>
              <Field label="Project">
                {(id) => (
                  <Select id={id} defaultValue={project} disabled={fixedProject}>
                    {PROJECTS.map((slug) => (
                      <option key={slug}>{slug}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <fieldset className="flex flex-col">
              <legend className="mb-1.5 text-sm font-medium">Alert when</legend>
              <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 border-y py-1.5">
                <Checkbox checked={events} onCheckedChange={(checked) => setEvents(checked === true)} aria-label="An issue gets many events" />
                <span>an issue gets</span>
                <Input aria-label="Events" inputMode="numeric" disabled={!events} defaultValue={rule?.quantity ?? 10} className="h-8 w-14 px-1 text-center font-mono max-lg:h-10 max-lg:w-12" />
                <span>events in</span>
                <Input aria-label="Minutes" inputMode="numeric" disabled={!events} defaultValue={rule?.timespanMinutes ?? 5} className="h-8 w-14 px-1 text-center font-mono max-lg:h-10 max-lg:w-12" />
                <span>minutes</span>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 border-b">
                <Checkbox checked={down} onCheckedChange={(checked) => setDown(checked === true)} />a monitor goes down
              </label>
              {!events && !down && <p className="mt-1.5 text-sm text-destructive">Pick at least one.</p>}
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Environments</legend>
              <div className="flex flex-wrap gap-2">
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
                {environments.length === 0 && <span className="self-center text-sm text-muted-foreground">All</span>}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Tell</legend>
              <ul className="flex flex-col gap-2">
                {recipients.map((recipient, index) => (
                  <li key={recipient.id ?? index} className="grid grid-cols-[minmax(0,1fr)_44px] gap-2 lg:grid-cols-[148px_minmax(0,1fr)_36px]">
                    <Select
                      aria-label="Recipient type"
                      value={recipient.recipientType}
                      onChange={(event) => change(index, { recipientType: event.target.value, url: '' })}
                      className="max-lg:col-span-2"
                    >
                      {Object.entries(RECIPIENTS)
                        .filter(([type]) => type !== RecipientType.email || !hasEmail || recipient.recipientType === RecipientType.email)
                        .map(([type, meta]) => (
                          <option key={type} value={type}>
                            {meta.label}
                          </option>
                        ))}
                    </Select>
                    {recipient.recipientType === RecipientType.email ? (
                      <span className="flex h-9 items-center text-muted-foreground max-lg:h-11">Project members</span>
                    ) : (
                      <Input aria-label="Address" className="font-mono" value={recipient.url ?? ''} placeholder={recipientMeta(recipient).placeholder} onChange={(event) => change(index, { url: event.target.value })} />
                    )}
                    <Button variant="ghost" size="icon" className="size-9 max-lg:size-11" aria-label="Remove recipient" onClick={() => setRecipients((current) => current.filter((_, at) => at !== index))}>
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button size="sm" className="mt-2 max-lg:h-11" onClick={() => setRecipients((current) => [...current, { id: -Date.now(), recipientType: RecipientType.webhook, url: '' }])}>
                <Plus />
                Add recipient
              </Button>
            </fieldset>
          </div>
          <div className="flex shrink-0 items-center gap-2 border-t p-3">
            {rule && (
              <Button variant="destructive" onClick={done} className="max-lg:h-11">
                Delete
              </Button>
            )}
            {rule && (
              <Button className="ml-auto max-lg:h-11" onClick={() => notify(`Test sent to ${recipients.length} ${recipients.length === 1 ? 'recipient' : 'recipients'}`)}>
                Send test
              </Button>
            )}
            <Button type="submit" variant="default" className={cn('max-lg:h-11', !rule && 'ml-auto')} disabled={!events && !down}>
              {rule ? 'Save rule' : 'Create rule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const RELEASE_COLUMNS = 'lg:grid-cols-[minmax(0,3fr)_minmax(0,3fr)_72px_72px_72px_72px_72px]'

function Releases() {
  const range = spanFor(Period.fortnight)
  const marks = releaseMarksIn(range)
  return (
    <>
      <PageBar>
        <span className="text-sm font-medium">Releases</span>
      </PageBar>
      <div className="grid items-end gap-x-6 border-b px-3 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:px-4">
        <p>
          <span className="mono text-[1.375rem] leading-none font-semibold lg:text-[1.625rem]">{RELEASES.length}</span> releases
        </p>
        <div className="max-lg:mt-3">
          <MarkLabels marks={marks} />
          <Bars values={ORG_EVENTS} height={36} marks={marks} />
          <p className="label-caps mt-1 flex justify-between">
            <span>{dayLabel(range.from / 1000)}</span>
            <span>Events / day</span>
            <span>Today</span>
          </p>
        </div>
      </div>
      <div className={cn('sticky top-11 z-10 grid h-8 items-center gap-x-4 border-b bg-background px-4 max-lg:hidden', RELEASE_COLUMNS)}>
        <span className="label-caps">Version</span>
        <span className="label-caps">Projects</span>
        <span className="label-caps text-right">New</span>
        <span className="label-caps text-right">Issues</span>
        <span className="label-caps text-right">Commits</span>
        <span className="label-caps text-right">Deploys</span>
        <span className="label-caps text-right">Created</span>
      </div>
      <ul>
        {RELEASES.map((release) => {
          const issues = releaseIssues(release.version)
          const fresh = issues.filter((issue) => issue.firstSeenHere).length
          return (
            <li key={release.version} className="border-b">
              <PLink to={`releases/${encodeURIComponent(release.version)}`} className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-3 py-2.5 hover:bg-accent/60 lg:min-h-11 lg:px-4 lg:py-1.5', RELEASE_COLUMNS)}>
                <span className="mono truncate font-semibold" title={release.version}>
                  {release.shortVersion}
                </span>
                <span className="mono truncate text-muted-foreground max-lg:order-3 max-lg:col-span-2">{release.projects.map((project) => project.slug).join(', ')}</span>
                <span className={cn('mono text-right', fresh ? 'text-trend-new' : 'text-muted-foreground')}>
                  {fresh}
                  <span className="lg:hidden"> new</span>
                </span>
                <span className="mono text-right max-lg:hidden">{issues.length}</span>
                <span className="mono text-right max-lg:hidden">{release.commitCount}</span>
                <span className="mono text-right max-lg:hidden">{release.deployCount}</span>
                <time className="mono text-right text-muted-foreground max-lg:hidden" title={exact(release.dateCreated)}>
                  {ago(release.dateCreated, new Date(NOW))}
                </time>
              </PLink>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function ReleasePage({ release }: { release: Release }) {
  const issues = releaseIssues(release.version)
  const commits = releaseCommits(release)
  const deploys = releaseDeploys(release)
  const [files, setFiles] = useState(() => releaseFiles(release))
  const [deleting, setDeleting] = useState<number>()
  const doomed = files.find((file) => file.id === deleting)
  return (
    <>
      <PageBar>
        <Crumbs root="Releases" rootTo="releases">
          <span className="font-mono">{release.shortVersion}</span>
        </Crumbs>
      </PageBar>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-3 pb-16 md:px-4">
        <header className="pt-5">
          <h1 className="font-mono text-xl font-semibold break-all lg:text-2xl">{release.version}</h1>
          <p className="mono mt-2 text-muted-foreground">
            {release.projects.map((project) => project.slug).join(', ')} · created {stampTime(release.dateCreated)}
          </p>
          <dl className="mt-5 grid grid-cols-4 gap-x-4 border-y py-4">
            <Stat label="New issues" value={issues.filter((issue) => issue.firstSeenHere).length} tone={issues.some((issue) => issue.firstSeenHere) ? 'text-trend-new' : undefined} />
            <Stat label="Issues" value={issues.length} />
            <Stat label="Commits" value={release.commitCount} />
            <Stat label="Deploys" value={release.deployCount} />
          </dl>
        </header>

        <Section label="Issues" count={issues.length}>
          {issues.length === 0 && <p className="py-4 text-muted-foreground">No errors reported from this release.</p>}
          <ul>
            {issues.map((issue) => (
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
                  <time className="mono text-right text-muted-foreground max-lg:hidden">{ago(issue.lastSeen, new Date(NOW))}</time>
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <Section label="Deploys" count={deploys.length}>
          {deploys.length === 0 && <p className="py-4 text-muted-foreground">Not deployed anywhere yet.</p>}
          <ul>
            {deploys.map((deploy) => (
              <li key={deploy.id} className="grid min-h-9 grid-cols-[112px_minmax(0,1fr)_auto] items-center gap-4 border-b">
                <span className="mono font-semibold">{deploy.environment}</span>
                <span className="mono truncate text-muted-foreground">{deploy.url}</span>
                <time className="mono text-muted-foreground">{stampTime(deploy.dateCreated)}</time>
              </li>
            ))}
          </ul>
        </Section>

        <Section label="Commits" count={release.commitCount}>
          {commits.length === 0 && <p className="py-4 text-muted-foreground">No commits were sent with this release.</p>}
          <ul>
            {commits.map((commit) => (
              <li key={commit.id} className="grid min-h-9 grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 border-b py-1.5">
                <span className="mono text-muted-foreground">{commit.id.slice(0, 7)}</span>
                <span className="truncate max-lg:whitespace-normal">{commit.message}</span>
                <span className="mono text-muted-foreground max-lg:hidden">{commit.authorName}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section label="Files" count={files.length}>
          {files.length === 0 && <p className="py-4 text-muted-foreground">No source maps uploaded.</p>}
          <ul>
            {files.map((file) => (
              <li key={file.id} className="grid min-h-9 grid-cols-[minmax(0,1fr)_72px_44px] items-center gap-3 border-b lg:grid-cols-[minmax(0,1fr)_72px_36px]">
                <span className="mono truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="mono text-right text-muted-foreground">{bytes(file.size)}</span>
                <Button variant="ghost" size="icon" className="max-lg:size-11" aria-label={`Delete ${file.name}`} onClick={() => setDeleting(file.id)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Dialog open={Boolean(doomed)} onOpenChange={(next) => !next && setDeleting(undefined)}>
        <DialogContent aria-describedby={undefined} className="p-4">
          <DialogTitle>Delete this file?</DialogTitle>
          <p className="mono mt-2 break-all text-muted-foreground">{doomed?.name}</p>
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setFiles((current) => current.filter((file) => file.id !== deleting))
                setDeleting(undefined)
              }}
            >
              Delete file
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
