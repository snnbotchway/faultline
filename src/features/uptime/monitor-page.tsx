import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { projectAlertsQuery } from '@/api/alerts'
import { ApiError } from '@/api/client'
import { explain } from '@/api/errors'
import { isHttp, monitorActions, monitorChangesQuery, monitorKeys, monitorQuery, type MonitorDetail } from '@/api/monitors'
import { canWriteProjects, organizationQuery, projectsQuery } from '@/api/organizations'
import { recentReleasesQuery, type Release } from '@/api/releases'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { CRUMB_LINK, Crumbs } from '@/components/shell/crumbs'
import { Button } from '@/components/ui/button'
import { CopyField } from '@/features/settings/parts'
import { ConfirmDialog } from '@/components/ui/task-dialog'
import { Section, Stat } from '@/components/ui/section'
import { Skeleton } from '@/components/ui/skeleton'
import { RuleEditor } from '@/features/alerts/open-rule'
import { recipientMeta } from '@/features/alerts/recipient-kinds'
import { releaseBefore, shortName } from '@/lib/axis'
import { ago, brief, clock, exact } from '@/lib/format'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { every, responseText, span } from './format'
import { Health, checkHealth, checkScale, healthOf, isSlow, type Downtime, type HealthReport } from './health'
import { isMonitorId } from './address'
import { HEALTH, healthLine, isAlarm, isHeartbeat, reasonText, targetText } from './describe'
import { CheckBars, DowntimeGlyph, HealthGlyph } from './parts'

const CHECKS_SHOWN = 8

/** One monitor: its health and since when, its newest checks, every stretch of downtime with the release before it, and who hears about it. */
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
    const missing = !valid || (monitor.error instanceof ApiError && monitor.error.status === 404)
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
  const changes = useQuery(monitorChangesQuery(org, monitor.id, monitor.lastChange))
  const projects = useQuery(projectsQuery(org)).data
  const project = projects?.find((candidate) => candidate.id === monitor.projectID && candidate.slug)
  const releases = (useQuery(recentReleasesQuery(org)).data ?? []).filter((release) => !project || release.projects.some((other) => other.slug === project.slug))
  const alerts = useQuery({ ...projectAlertsQuery(org, project?.slug ?? ''), enabled: !!project })
  const rules = (alerts.data ?? []).filter((rule) => rule.uptime)
  // Which downtime is unfolded: the ongoing one until the user picks, and none once they fold it.
  const [unfolded, setUnfolded] = useState<number | null | undefined>()

  const report = healthOf(monitor, monitor.checks, changes.data ?? [], now)
  const health = report.health
  const heartbeat = isHeartbeat(monitor)
  const loud = isAlarm(health)
  const alsoSlow = health === Health.flapping && report.slow
  const open = unfolded === undefined ? report.downtimes.find((period) => period.ongoing)?.from : unfolded
  const recipients = [...new Set(rules.flatMap((rule) => rule.alertRecipients.map((recipient) => recipientMeta(recipient).label)))]
  const notified = !project ? 'Nobody' : alerts.isPending ? '…' : recipients.length ? recipients.join(', ') : 'Nobody'
  const facts: [string, string | null | undefined][] = [
    ['Check', monitor.monitorType],
    ['Status', isHttp(monitor.monitorType) ? String(monitor.expectedStatus ?? '') : null],
    ['Text', monitor.expectedBody || null],
    ['Timeout', monitor.timeout ? `${monitor.timeout}s` : null],
    ['Down after', heartbeat ? null : `${monitor.confirmationThreshold} failed`],
    ['Project', project?.slug ?? monitor.projectName],
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
          <p className="mono mt-2 [overflow-wrap:anywhere] text-muted-foreground">{heartbeat ? targetText(monitor) : `${monitor.monitorType} ${targetText(monitor)} every ${every(monitor.interval)}`}</p>
        </header>

        <div className="order-3">
          <Section label="Downtime" count={changes.data ? report.downtimes.length : undefined}>
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
                    notified={notified}
                  />
                ))}
              </ul>
            )}
          </Section>

          <LatestChecks monitor={monitor} now={now} />
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
                    <Link to="/$org/alerts" params={{ org }} search={{ alertProject: project!.slug!, alert: rule.id! }} className="block py-2 hover:bg-accent/60">
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
                  <Link to="/$org/alerts" params={{ org }} search={{ alertProject: project.slug!, alert: RuleEditor.new }} className="text-brand hover:underline">
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
            {!heartbeat && <Stat label="Response" value={responseText(report.typical) || 'None'} tone={report.slow ? HEALTH[Health.slow].color : undefined} />}
            {!heartbeat && <Stat label="Slow" value={slowChecks} tone={slowChecks ? HEALTH[Health.slow].color : undefined} />}
          </dl>
          {!heartbeat && (
            <>
              <CheckBars checks={checks} timeout={monitor.timeout} height={64} line className="mt-4" />
              <p className="mono mt-2 flex justify-between gap-2 text-muted-foreground">
                <span>{clock(checks.at(-1)!.startCheck)}</span>
                <span className="flex items-center gap-2">
                  peak {responseText(peak)}
                  {overLimit && (
                    <span className="flex items-center gap-1">
                      <span aria-hidden className="h-0.5 w-3 bg-foreground" />
                      slow over {responseText(over!)}
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

// One stretch of downtime: when it began, why, and how long it lasted; unfolded, the moments, the release before it and who was told.
function DowntimeRow({ monitor, period, now, unfolded, onToggle, before, notified }: { monitor: MonitorDetail; period: Downtime; now: number; unfolded: boolean; onToggle: () => void; before?: Release; notified: string }) {
  const details: { label: string; value: string; title?: string }[] = [
    { label: 'Went down', value: brief(new Date(period.from)) },
    { label: 'Came back', value: period.ongoing ? 'Not yet' : brief(new Date(period.to)) },
    { label: 'Release before', value: before ? `${shortName(before.version)}, ${span(period.from - Date.parse(before.dateCreated))} earlier` : 'None', title: before?.version },
    { label: 'Notified', value: notified },
  ]
  return (
    <li className="border-b">
      <button
        type="button"
        aria-expanded={unfolded}
        onClick={onToggle}
        className={cn('grid min-h-11 w-full cursor-pointer grid-cols-[48px_minmax(0,1fr)_auto_16px] items-center gap-x-3 py-2 text-left', unfolded ? 'bg-accent' : 'hover:bg-accent/60')}
      >
        <time className="mono text-muted-foreground" dateTime={new Date(period.from).toISOString()} title={exact(new Date(period.from))}>
          {ago(new Date(period.from), new Date(now))}
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
        <dl className="border-t bg-card px-3 py-2 lg:pl-15">
          {details.map((detail) => (
            <div key={detail.label} className="flex min-h-8 items-center justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">{detail.label}</dt>
              <dd className="mono truncate" title={detail.title}>
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}

// The newest checks, a few at first and all 60 on request.
function LatestChecks({ monitor, now }: { monitor: MonitorDetail; now: number }) {
  const [allChecks, setAllChecks] = useState(false)
  const checks = monitor.checks
  return (
    <Section label="Latest checks" className="mt-8">
      {checks.length === 0 ? (
        <p className="py-4 text-muted-foreground">No checks yet.</p>
      ) : (
        <ul>
          {checks.slice(0, allChecks ? undefined : CHECKS_SHOWN).map((check) => {
            const state = checkHealth(check, monitor.timeout)
            return (
              <li key={check.startCheck} className="grid min-h-9 grid-cols-[48px_minmax(0,1fr)_64px] items-center gap-3 border-b lg:grid-cols-[48px_minmax(0,1fr)_72px]">
                <time className="mono text-muted-foreground" dateTime={check.startCheck} title={exact(check.startCheck)}>
                  {ago(check.startCheck, new Date(now))}
                </time>
                <span className="flex min-w-0 items-center gap-2">
                  <HealthGlyph health={state} />
                  <span className={cn('truncate', state !== Health.up && HEALTH[state].color)}>{state === Health.down ? reasonText(monitor, check.reason) : HEALTH[state].label}</span>
                </span>
                <span className={cn('mono text-right', state === Health.slow && cn('font-semibold', HEALTH[state].color))}>{responseText(check.responseTime)}</span>
              </li>
            )
          })}
        </ul>
      )}
      {!allChecks && checks.length > CHECKS_SHOWN && (
        <Button className="mt-3" onClick={() => setAllChecks(true)}>
          All {checks.length} checks
        </Button>
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
