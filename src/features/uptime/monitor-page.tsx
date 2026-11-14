import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { projectAlertsQuery } from '@/api/alerts'
import { ApiError } from '@/api/client'
import { isHttp, monitorActions, monitorChangesQuery, monitorKeys, monitorQuery, type MonitorDetail } from '@/api/monitors'
import { canWriteProjects, organizationQuery, projectsQuery } from '@/api/organizations'
import { recentReleasesQuery } from '@/api/releases'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { CRUMB_LINK, Crumbs } from '@/components/shell/crumbs'
import { Button } from '@/components/ui/button'
import { CopyField } from '@/components/ui/copy-field'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Section, Stat } from '@/components/ui/section'
import { Skeleton } from '@/components/ui/skeleton'
import { RuleEditor } from '@/features/alerts/open-rule'
import { recipientMeta } from '@/features/alerts/recipient-kinds'
import { ago, brief, clock, exact } from '@/features/issues/format'
import { shortName } from '@/features/issues/trend'
import { releaseBefore } from '@/features/releases/marks'
import { failed } from '@/lib/notice'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { every, responseText, span } from './format'
import { Health, checkHealth, healthOf, isSlow, slowOver } from './health'
import { HEALTH, healthLine, isAlarm, isHeartbeat, isMonitorId, reasonText, targetText } from './describe'
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
          <Button asChild size="sm" className="max-lg:h-9">
            <Link to="/$org/uptime-monitors/$monitorId/update" params={{ org, monitorId: String(monitorId) }}>
              Edit
            </Link>
          </Button>
          <Button size="sm" variant="destructive" className="max-lg:h-9" onClick={() => setConfirming(true)}>
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
      {confirming && <DeleteMonitor org={org} monitor={monitor.data} onClose={() => setConfirming(false)} />}
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
  const [allChecks, setAllChecks] = useState(false)

  const report = healthOf(monitor, monitor.checks, changes.data ?? [], now)
  const health = report.health
  const heartbeat = isHeartbeat(monitor)
  const checks = monitor.checks
  const passed = checks.filter((check) => check.isUp).length
  const slowChecks = checks.filter((check) => isSlow(check, monitor.timeout)).length
  const peak = Math.max(0, ...checks.filter((check) => check.isUp).map((check) => check.responseTime ?? 0))
  const over = slowOver(monitor.timeout)
  const loud = isAlarm(health)
  const alsoSlow = health === Health.flapping && report.slow
  const open = unfolded === undefined ? report.downtimes.find((period) => period.ongoing)?.from : unfolded
  const notified = [...new Set(rules.flatMap((rule) => rule.alertRecipients.map((recipient) => recipientMeta(recipient).label)))]
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
                {report.downtimes.map((period) => {
                  const unfoldedHere = open === period.from
                  const before = releaseBefore(releases, period.from)
                  const details: { label: string; value: string; title?: string }[] = [
                    { label: 'Went down', value: brief(new Date(period.from)) },
                    { label: 'Came back', value: period.ongoing ? 'Not yet' : brief(new Date(period.to)) },
                    { label: 'Release before', value: before ? `${shortName(before.version)}, ${span(period.from - Date.parse(before.dateCreated))} earlier` : 'None', title: before?.version },
                    { label: 'Notified', value: !project ? 'Nobody' : alerts.isPending ? '…' : notified.length ? notified.join(', ') : 'Nobody' },
                  ]
                  return (
                    <li key={period.from} className="border-b">
                      <button
                        type="button"
                        aria-expanded={unfoldedHere}
                        onClick={() => setUnfolded(unfoldedHere ? null : period.from)}
                        className={cn('grid min-h-11 w-full cursor-pointer grid-cols-[48px_minmax(0,1fr)_auto_16px] items-center gap-x-3 py-2 text-left', unfoldedHere ? 'bg-accent' : 'hover:bg-accent/60')}
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
                        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', unfoldedHere && 'rotate-180')} />
                      </button>
                      {unfoldedHere && (
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
                })}
              </ul>
            )}
          </Section>

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
              <Button size="sm" className="mt-3 max-lg:h-11" onClick={() => setAllChecks(true)}>
                All {checks.length} checks
              </Button>
            )}
          </Section>
        </div>
      </div>

      <aside className="contents lg:flex lg:flex-col lg:gap-8 lg:border-l lg:pt-5 lg:pl-6">
        <div className="order-2 pb-8 lg:pb-0">
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
                        {over !== undefined && peak > over && (
                          <span className="flex items-center gap-1">
                            <span aria-hidden className="h-0.5 w-3 bg-foreground" />
                            slow over {responseText(over)}
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
                    <Link to="/$org/alerts" params={{ org }} search={{ alertProject: project!.slug!, alert: String(rule.id) }} className="block py-2 hover:bg-accent/60">
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

function DeleteMonitor({ org, monitor, onClose }: { org: string; monitor: MonitorDetail; onClose: () => void }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const remove = useMutation({
    mutationFn: () => monitorActions.remove(org, monitor.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: monitorKeys.detail(org, monitor.id) })
      void queryClient.invalidateQueries({ queryKey: monitorKeys.all(org) })
      void navigate({ to: '/$org/uptime-monitors', params: { org } })
    },
    onError: (error) => failed(error, 'delete the monitor'),
  })
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined} className="p-4">
        <DialogTitle>Delete {monitor.name}?</DialogTitle>
        <p className="mt-2 text-muted-foreground">Its check history is deleted with it.</p>
        <div className="mt-4 flex justify-end gap-2">
          <DialogClose asChild>
            <Button className="max-lg:h-11">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" className="max-lg:h-11" aria-busy={remove.isPending} disabled={remove.isPending} onClick={() => remove.mutate()}>
            Delete monitor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
