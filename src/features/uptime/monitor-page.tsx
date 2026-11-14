import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { StatsPeriod } from '@/api/issues'
import { projectAlertsQuery } from '@/api/alerts'
import { explain, isNotFound } from '@/api/errors'
import { CHECKS_PAGE_SIZE, isHttp, monitorActions, monitorChangesQuery, monitorChecksQuery, monitorKeys, monitorQuery, type MonitorDetail } from '@/api/monitors'
import { canWriteProjects, organizationQuery, projectSlug, projectsQuery } from '@/api/organizations'
import { canOpenRelease, recentReleasesQuery, type Release } from '@/api/releases'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { CRUMB_LINK, Crumbs } from '@/components/shell/crumbs'
import { Button } from '@/components/ui/button'
import { CopyField } from '@/features/settings/parts'
import { ConfirmDialog } from '@/components/ui/task-dialog'
import { Section, Stat } from '@/components/ui/section'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { RuleEditor } from '@/features/alerts/open-rule'
import { recipientMeta } from '@/features/alerts/recipient-kinds'
import { MarkLabels, PeriodToggle } from '@/features/issues/trace'
import { releaseBefore, releaseMarks, spanAxis } from '@/features/issues/trend'
import { releaseName } from '@/lib/text'
import { ago, brief, clock, dayTime, exact } from '@/features/issues/format'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { every, periodLength, span } from './format'
import { Health, checkHealth, checkScale, healthOf, isSlow, percent, uptimeShare, type Downtime, type HealthReport } from './health'
import { isMonitorId } from './address'
import { HEALTH, healthLine, isAlarm, isHeartbeat, reasonText, targetText } from './describe'
import { CheckBars, DowntimeGlyph, DowntimeStrip, HealthGlyph } from './parts'
import { formatMs } from '@/features/performance/format'

const ChecksView = { all: 'all', incidents: 'incidents' } as const
type ChecksView = (typeof ChecksView)[keyof typeof ChecksView]
const CHECKS_VIEWS = [
  { value: ChecksView.all, label: 'All' },
  { value: ChecksView.incidents, label: 'Incidents only' },
]

/** One monitor: its health and since when, its uptime, its checks, every stretch of downtime with the release before it, and who hears about it. */
export function MonitorPage({ org, monitorId }: { org: string; monitorId: number }) {
  const valid = isMonitorId(monitorId)
  const monitor = useQuery({ ...monitorQuery(org, monitorId), enabled: valid })
  const canWrite = canWriteProjects(useQuery(organizationQuery(org)).data?.access)
  const [confirming, setConfirming] = useState(false)
  useTitle(monitor.data?.name ?? 'Monitor', 'Uptime')

  const bar = (
    <PageBar>
      <Crumbs
        root={
          <Link to="/$org/uptime-monitors" params={{ org }} className={CRUMB_LINK}>
            Uptime
          </Link>
        }
      >
        {monitor.data?.name}
      </Crumbs>
      {canWrite && monitor.data && (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button asChild size="bar">
            <Link to="/$org/uptime-monitors/$monitorId/update" params={{ org, monitorId: String(monitorId) }}>
              Edit
            </Link>
          </Button>
          <Button size="bar" variant="destructive" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        </div>
      )}
    </PageBar>
  )

  if (!valid || monitor.isError) {
    const missing = !valid || (isNotFound(monitor.error))
    return (
      <>
        {bar}
        <Screen title={missing ? 'Monitor not found' : "This monitor didn't load"}>
          {missing ? (
            <Button asChild>
              <Link to="/$org/uptime-monitors" params={{ org }}>
                Go to uptime
              </Link>
            </Button>
          ) : (
            <Button onClick={() => void monitor.refetch()}>Try again</Button>
          )}
        </Screen>
      </>
    )
  }
  if (!monitor.data)
    return (
      <>
        {bar}
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-5 md:px-4" aria-busy aria-label="Loading monitor">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      </>
    )

  return (
    <>
      {bar}
      <MonitorBody org={org} monitor={monitor.data} now={monitor.dataUpdatedAt} />
      <DeleteMonitor org={org} monitor={monitor.data} open={confirming} onClose={() => setConfirming(false)} />
    </>
  )
}

function MonitorBody({ org, monitor, now }: { org: string; monitor: MonitorDetail; now: number }) {
  const project = projectSlug(useQuery(projectsQuery(org)).data, monitor.projectID ? Number(monitor.projectID) : undefined)
  const releases = (useQuery(recentReleasesQuery(org)).data ?? []).filter((release) => !project || release.projects.some((other) => other.slug === project))
  const alerts = useQuery({ ...projectAlertsQuery(org, project ?? ''), enabled: !!project })
  const rules = (alerts.data ?? []).filter((rule) => rule.uptime)
  // Which downtime is unfolded: the ongoing one until the user picks, and none once they fold it.
  const [unfolded, setUnfolded] = useState<number | null | undefined>()
  const [period, setPeriod] = useState<StatsPeriod>(StatsPeriod.day)
  const periodMs = periodLength(period)
  const changes = useQuery(monitorChangesQuery(org, monitor.id, monitor.lastChange, periodMs))
  const from = now - periodMs
  const marks = releaseMarks(releases, spanAxis(from, now))

  const report = healthOf(monitor, monitor.checks, changes.data?.changes ?? [], now)
  const health = report.health
  const uptime = changes.data && health !== Health.waiting ? uptimeShare(changes.data, monitor.created, now, periodMs) : undefined
  const heartbeat = isHeartbeat(monitor)
  const loud = isAlarm(health)
  const alsoSlow = health === Health.flapping && report.slow
  const open = unfolded === undefined ? report.downtimes.find((period) => period.ongoing)?.from : unfolded
  // Who hears about it now. Only an ongoing downtime says so: the rules may have changed since an older one.
  const recipients = [...new Set(rules.flatMap((rule) => rule.alertRecipients.map((recipient) => recipientMeta(recipient).label)))]
  const alertsGoTo = !project || (alerts.isSuccess && recipients.length === 0) ? 'Nobody' : alerts.isPending ? undefined : recipients.join(', ')
  const facts: [string, string | null | undefined][] = [
    ['Check', monitor.monitorType],
    ['Status', isHttp(monitor.monitorType) ? String(monitor.expectedStatus ?? '') : null],
    ['Text', monitor.expectedBody || null],
    ['Timeout', monitor.timeout ? `${monitor.timeout}s` : null],
    ['Down after', heartbeat ? null : `${monitor.confirmationThreshold} failed`],
    ['Project', project ?? monitor.projectName],
    ['Environment', monitor.envName],
  ]

  return (
    // On a phone the two columns become one: title, checks, downtime, latest checks, setup, alerts.
    <div className="mx-auto flex w-full max-w-6xl flex-col px-3 pb-16 md:px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-x-10">
      <div className="contents lg:block lg:min-w-0">
        <header className="order-1 py-5">
          <h1 className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-semibold', loud && HEALTH[health].color)}>
            <HealthGlyph health={health} className="size-4" />
            <span className="[overflow-wrap:anywhere]">
              {monitor.name} {HEALTH[health].headline}
            </span>
            {alsoSlow && <span className={cn('label-caps', HEALTH[Health.slow].color)}>{HEALTH[Health.slow].label}</span>}
          </h1>
          {health !== Health.waiting && <p className="mt-1 font-medium">{healthLine(monitor, report, now)}</p>}
          <p className="mt-2 [overflow-wrap:anywhere] text-muted-foreground">
            {heartbeat ? (
              `Heartbeat ${targetText(monitor)}`
            ) : (
              <>
                <span className="mono">
                  {monitor.monitorType} {targetText(monitor)}
                </span>{' '}
                <span className="whitespace-nowrap">every {every(monitor.interval)}</span>
              </>
            )}
          </p>
        </header>

        <div className="order-3">
          <Section label="Downtime" count={changes.data ? report.downtimes.length : undefined} action={<PeriodToggle period={period} onChange={setPeriod} />}>
            {changes.data && (
              // Every stretch down in the period on one strip, with the releases made in it.
              <div className="pt-3 pb-4">
                <div className="relative pt-5">
                  <MarkLabels marks={marks} />
                  <DowntimeStrip downtimes={report.downtimes} from={from} to={now} marks={marks} phoneMarks waiting={health === Health.waiting} height={28} />
                </div>
                <p className="label-caps mt-2 flex justify-between">
                  <span>{dayTime(new Date(from), new Date(now))}</span>
                  <span>Now</span>
                </p>
                {uptime && (
                  <p className="mt-3">
                    <span className={cn('mono font-semibold', uptime.share < 1 && HEALTH[Health.down].color)}>{percent(uptime.share)}</span> up{' '}
                    {uptime.sinceFirst ? 'since its first check' : `in the last ${period === StatsPeriod.day ? '24 hours' : '14 days'}`}
                  </p>
                )}
              </div>
            )}
            {changes.isPending ? (
              <Skeleton className="mt-3 h-20" />
            ) : changes.isError ? (
              <p className="py-4 text-muted-foreground">The downtime didn't load.</p>
            ) : report.downtimes.length === 0 ? (
              <p className="py-4 text-muted-foreground">{health === Health.waiting ? 'Nothing to show until the first check.' : 'No downtime recorded.'}</p>
            ) : (
              <ul>
                {report.downtimes.map((period) => (
                  <DowntimeRow
                    key={period.from}
                    monitor={monitor}
                    period={period}
                    now={now}
                    unfolded={open === period.from}
                    onToggle={() => setUnfolded(open === period.from ? null : period.from)}
                    before={releaseBefore(releases, period.from)}
                    org={org}
                    alertsGoTo={period.ongoing ? alertsGoTo : undefined}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Checks org={org} monitor={monitor} now={now} />
        </div>
      </div>

      <aside className="contents lg:flex lg:flex-col lg:gap-8 lg:border-l lg:pt-5 lg:pl-6">
        <div className="order-2 pb-8 lg:pb-0">
          <CheckSummary monitor={monitor} report={report} />
        </div>
        <div className="order-4 mt-8 flex flex-col gap-8 lg:mt-0">
          {heartbeat && monitor.heartbeatEndpoint && (
            <Section label="Heartbeat address">
              <CopyField value={monitor.heartbeatEndpoint} label="Heartbeat address" className="mt-3" />
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
          <Section label="Alerts" count={project && alerts.data ? rules.length : undefined}>
            {project && alerts.isPending ? (
              <Skeleton className="mt-3 h-12" />
            ) : rules.length > 0 ? (
              <ul>
                {rules.map((rule) => (
                  <li key={rule.id} className="border-b">
                    <Link to="/$org/alerts" params={{ org }} search={{ alertProject: project!, alert: rule.id! }} className="block py-2 hover:bg-accent/60">
                      <span className="block font-medium">{rule.name}</span>
                      <span className="block text-sm text-muted-foreground">{rule.alertRecipients.map((recipient) => recipientMeta(recipient).label).join(', ')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-muted-foreground">
                Nobody hears when this goes down.{' '}
                {project ? (
                  <Link to="/$org/alerts" params={{ org }} search={{ alertProject: project, alert: RuleEditor.new }} className="text-brand hover:underline">
                    Add a rule
                  </Link>
                ) : (
                  <Link to="/$org/uptime-monitors/$monitorId/update" params={{ org, monitorId: String(monitor.id) }} className="text-brand hover:underline">
                    Link a project
                  </Link>
                )}
              </p>
            )}
          </Section>
        </div>
      </aside>
    </div>
  )
}

// The newest checks at a glance: how many passed, the typical response, how many were slow, and each as a bar.
function CheckSummary({ monitor, report }: { monitor: MonitorDetail; report: HealthReport }) {
  const checks = monitor.checks
  const heartbeat = isHeartbeat(monitor)
  const health = report.health
  const passed = checks.filter((check) => check.isUp).length
  const slowChecks = checks.filter((check) => isSlow(check, monitor.timeout)).length
  const { peak, over, overLimit } = checkScale(checks, monitor.timeout)
  return (
    <Section label={checks.length ? `Last ${checks.length} checks` : 'Checks'}>
      {checks.length === 0 ? (
        <p className="py-3 text-muted-foreground">None yet.</p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-x-4 pt-3">
            <Stat label="Passed" value={`${passed}/${checks.length}`} tone={health === Health.down ? HEALTH[Health.down].color : undefined} />
            {!heartbeat && <Stat label="Response" value={report.typical === undefined ? 'None' : formatMs(report.typical)} tone={report.slow ? HEALTH[Health.slow].color : undefined} />}
            {!heartbeat && <Stat label="Slow" value={slowChecks} tone={slowChecks ? HEALTH[Health.slow].color : undefined} />}
          </dl>
          {!heartbeat && (
            <>
              <CheckBars checks={checks} timeout={monitor.timeout} height={64} line className="mt-4" />
              <p className="mono mt-2 flex justify-between gap-2 text-muted-foreground">
                <span>{clock(checks.at(-1)!.startCheck)}</span>
                <span className="flex items-center gap-2">
                  peak {formatMs(peak)}
                  {overLimit && (
                    <span className="flex items-center gap-1">
                      <span aria-hidden className="h-0.5 w-3 bg-foreground" />
                      slow over {formatMs(over!)}
                    </span>
                  )}
                </span>
                <span>Now</span>
              </p>
            </>
          )}
        </>
      )}
    </Section>
  )
}

// One stretch of downtime: when it began, why, and how long it lasted; unfolded, the moments and the release before it.
// An ongoing one also says who its alerts go to now.
function DowntimeRow({
  org,
  monitor,
  period,
  now,
  unfolded,
  onToggle,
  before,
  alertsGoTo,
}: {
  org: string
  monitor: MonitorDetail
  period: Downtime
  now: number
  unfolded: boolean
  onToggle: () => void
  before?: Release
  alertsGoTo?: string
}) {
  const releaseText = before && releaseName(before.version)
  // Times and versions are machine text; the words around them are not.
  const details: { label: string; value: ReactNode; mono?: boolean }[] = [
    { label: 'Went down', value: brief(new Date(period.from)), mono: true },
    period.ongoing ? { label: 'Came back', value: 'Not yet' } : { label: 'Came back', value: brief(new Date(period.to)), mono: true },
    {
      label: 'Release before',
      value: before ? (
        <>
          {canOpenRelease(before.version) ? (
            <Link to="/$org/releases/$" params={{ org, _splat: before.version }} title={before.version} className="mono hover:underline">
              {releaseText}
            </Link>
          ) : (
            <span className="mono" title={before.version}>
              {releaseText}
            </span>
          )}
          , <span className="mono">{span(period.from - Date.parse(before.dateCreated))}</span> earlier
        </>
      ) : (
        'None'
      ),
    },
    ...(alertsGoTo ? [{ label: 'Alerts go to', value: alertsGoTo }] : []),
  ]
  return (
    <li className="border-b">
      <button
        type="button"
        aria-expanded={unfolded}
        onClick={onToggle}
        className={cn('grid min-h-11 w-full cursor-pointer grid-cols-[64px_minmax(0,1fr)_auto_16px] items-center gap-x-3 py-2 text-left', unfolded ? 'bg-accent' : 'hover:bg-accent/60')}
      >
        {/* "ago", so a start is not read as a length; the length is at the right. */}
        <time className="mono text-muted-foreground" dateTime={new Date(period.from).toISOString()} title={exact(new Date(period.from))}>
          {ago(new Date(period.from), new Date(now))} ago
        </time>
        <span className="flex min-w-0 items-center gap-2">
          <DowntimeGlyph ongoing={period.ongoing} />
          <span className="truncate">{reasonText(monitor, period.reason)}</span>
        </span>
        <span className={cn('mono', period.ongoing && cn('font-semibold', HEALTH[Health.down].color))}>
          {span(period.to - period.from)}
          {period.ongoing && ' so far'}
        </span>
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', unfolded && 'rotate-180')} />
      </button>
      {unfolded && (
        <dl className="border-t bg-card px-3 py-2 lg:pl-19">
          {details.map((detail) => (
            <div key={detail.label} className="flex min-h-8 items-center justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">{detail.label}</dt>
              <dd className={cn('truncate', detail.mono && 'mono')}>{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}

// Every check, newest first, a page at a time; "Incidents only" keeps the ones where the monitor went down or came back.
function Checks({ org, monitor, now }: { org: string; monitor: MonitorDetail; now: number }) {
  const [view, setView] = useState<ChecksView>(ChecksView.all)
  // The cursor of each page opened so far, from the newest; the last is the page shown.
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])
  const checks = useQuery(monitorChecksQuery(org, monitor.id, view === ChecksView.incidents, cursors.at(-1)))
  const items = checks.data?.items ?? []
  const { hits, maxHits } = checks.data ?? {}
  const older = checks.data?.cursors.next
  // The backend counts no further than its cap.
  const total = hits === undefined ? undefined : `${hits}${maxHits !== undefined && hits >= maxHits ? '+' : ''}`
  const offset = (cursors.length - 1) * CHECKS_PAGE_SIZE
  // Until the page asked for is in, the one shown belongs to another page or view.
  const stale = checks.isPlaceholderData
  const show = (to: ChecksView) => {
    setView(to)
    setCursors([undefined])
  }
  return (
    <Section label="Checks" className="mt-8" action={<Segmented label="Show checks" value={view} options={CHECKS_VIEWS} onChange={show} />}>
      {checks.isPending ? (
        <Skeleton className="mt-3 h-40" />
      ) : checks.isError ? (
        <p className="py-4 text-muted-foreground">
          The checks didn't load.{' '}
          <button type="button" className="text-brand hover:underline" onClick={() => void checks.refetch()}>
            Try again
          </button>
        </p>
      ) : items.length === 0 ? (
        <p className="py-4 text-muted-foreground">{view === ChecksView.incidents ? 'No incidents recorded.' : 'No checks yet.'}</p>
      ) : (
        <table className={cn('w-full', stale && 'opacity-60')}>
          <caption className="sr-only">{total} checks, newest first</caption>
          <thead>
            <tr className="label-caps h-9 text-left">
              <th scope="col" className="w-36 font-normal">
                Time
              </th>
              <th scope="col" className="font-normal">
                Result
              </th>
              <th scope="col" className="w-20 text-right font-normal lg:w-24">
                Response
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((check) => {
              const state = checkHealth(check, monitor.timeout)
              return (
                <tr key={check.startCheck} className="h-9 border-t">
                  <td>
                    <time className="mono text-muted-foreground" dateTime={check.startCheck} title={exact(check.startCheck)}>
                      {ago(check.startCheck, new Date(now))}
                    </time>
                  </td>
                  <td>
                    <span className="flex min-w-0 items-center gap-2">
                      <HealthGlyph health={state} />
                      <span className={cn('truncate', state !== Health.up && HEALTH[state].color)}>{state === Health.down ? reasonText(monitor, check.reason) : HEALTH[state].label}</span>
                    </span>
                  </td>
                  <td className={cn('mono text-right', state === Health.slow && cn('font-semibold', HEALTH[state].color))}>{check.responseTime == null ? '' : formatMs(check.responseTime)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {items.length > 0 && (cursors.length > 1 || older) && (
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className={cn('mono text-muted-foreground', stale && 'invisible')}>
            {offset + 1}–{offset + items.length}
            {total !== undefined && ` of ${total}`}
          </p>
          <div className="flex shrink-0 items-center">
            <Button variant="ghost" size="icon-sm" className="max-lg:size-11" disabled={stale || !older} onClick={() => setCursors([...cursors, older])} aria-label="Older checks">
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon-sm" className="max-lg:size-11" disabled={stale || cursors.length === 1} onClick={() => setCursors(cursors.slice(0, -1))} aria-label="Newer checks">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </Section>
  )
}

function DeleteMonitor({ org, monitor, open, onClose }: { org: string; monitor: MonitorDetail; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const remove = useMutation({
    mutationFn: () => monitorActions.remove(org, monitor.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: monitorKeys.detail(org, monitor.id) })
      void queryClient.invalidateQueries({ queryKey: monitorKeys.all(org) })
      void navigate({ to: '/$org/uptime-monitors', params: { org } })
    },
    onError: (failure) => setError(explain(failure, 'delete the monitor')),
  })
  return (
    <ConfirmDialog
      open={open}
      title={`Delete ${monitor.name}?`}
      description="Its check history is deleted with it."
      action="Delete monitor"
      busy={remove.isPending}
      error={error}
      onConfirm={() => {
        setError(undefined)
        remove.mutate()
      }}
      onClose={onClose}
    />
  )
}
