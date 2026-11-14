import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { StatsPeriod } from '@/api/issues'
import { MonitorSort, monitorListQuery, statusPagesQuery, type Monitor } from '@/api/monitors'
import { canWriteProjects, organizationQuery } from '@/api/organizations'
import { recentReleasesQuery } from '@/api/releases'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PeriodToggle, ReleaseLabels, ReleaseRules } from '@/features/issues/trace'
import { periodInfo } from '@/features/issues/trend'
import { releaseMarks, spanAxis, type Mark } from '@/lib/axis'
import { ago, dayTime, exact, noun } from '@/lib/format'
import { SECOND_MS } from '@/lib/time'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { responseText } from './format'
import { Health } from './health'
import { HEALTH, downReason, healthLine, isAlarm, isHeartbeat, targetText, UptimeTab } from './describe'
import { CheckBars, DowntimeStrip, HealthGlyph, UptimeTabs } from './parts'
import { useMonitorHealth, type MonitorHealth } from './use-health'

// How far back the shared time axis reaches, in milliseconds.
const periodLength = (period: StatsPeriod) => periodInfo(period).size * periodInfo(period).count * SECOND_MS

const COLUMNS = 'lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_232px_80px]'
const GROUPS: Health[] = [Health.down, Health.flapping, Health.slow, Health.up, Health.waiting]
const GROUP_LABEL: Record<Health, string> = {
  [Health.down]: 'Down',
  [Health.flapping]: 'Flapping',
  [Health.slow]: 'Slow',
  [Health.up]: 'Up',
  [Health.waiting]: 'Waiting for a first check',
}

/** The monitors, grouped by what needs attention first, each with its downtime on one shared time axis. */
export function UptimeList({ org, period = StatsPeriod.day }: { org: string; period?: StatsPeriod }) {
  useTitle('Uptime')
  const navigate = useNavigate()
  const list = useInfiniteQuery(monitorListQuery(org, MonitorSort.name))
  const pages = useQuery(statusPagesQuery(org)).data
  const releases = useQuery(recentReleasesQuery(org)).data
  const canWrite = canWriteProjects(useQuery(organizationQuery(org)).data?.access)
  const monitors = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data])
  const [opened] = useState(Date.now)
  const now = list.dataUpdatedAt || opened
  const health = useMonitorHealth(org, monitors, now)
  const from = now - periodLength(period)
  const marks = releaseMarks(releases ?? [], spanAxis(from, now))
  const setPeriod = (next: StatsPeriod) => void navigate({ to: '/$org/uptime-monitors', params: { org }, search: next === StatsPeriod.day ? {} : { period: next }, replace: true })
  const ready = (monitor: Monitor) => health.get(monitor.id)?.loaded === true
  // The list shows once every monitor on the first page has its health. After that, a monitor that
  // joins it (another page, or a new monitor) waits in a loading row of its own.
  const [shown, setShown] = useState(false)
  if (!shown && list.isSuccess && monitors.every(ready)) setShown(true)
  const pending = monitors.filter((monitor) => !ready(monitor))
  const count = (state: Health) => monitors.filter((monitor) => ready(monitor) && health.get(monitor.id)!.report.health === state).length
  const toggle = <PeriodToggle period={period} onChange={setPeriod} />

  const bar = (
    <PageBar>
      <UptimeTabs org={org} current={UptimeTab.monitors} counts={{ [UptimeTab.monitors]: list.isSuccess ? monitors.length : undefined, [UptimeTab.statusPages]: pages?.length }} />
      <div className="ml-auto flex items-center gap-2">
        {monitors.length > 0 && <div className="max-lg:hidden">{toggle}</div>}
        {canWrite && (
          <Button asChild variant="default" size="sm" className="max-lg:h-9">
            <Link to="/$org/uptime-monitors/new" params={{ org }}>
              New monitor
            </Link>
          </Button>
        )}
      </div>
    </PageBar>
  )

  if (list.isError)
    return (
      <>
        {bar}
        <Screen title="The monitors didn't load">
          <Button onClick={() => void list.refetch()}>Try again</Button>
        </Screen>
      </>
    )
  if (list.isSuccess && monitors.length === 0)
    return (
      <>
        {bar}
        <Screen title="Add a monitor to see when a site or job goes down">
          {canWrite && (
            <Button asChild variant="default">
              <Link to="/$org/uptime-monitors/new" params={{ org }}>
                New monitor
              </Link>
            </Button>
          )}
        </Screen>
      </>
    )

  const alarms = GROUPS.filter(isAlarm).filter((state) => count(state) > 0)
  return (
    <>
      {bar}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-3 py-3 lg:px-4" aria-live="polite">
        {shown ? (
          <>
            <span>
              <span className="mono text-2xl leading-none font-semibold lg:text-3xl">{monitors.length}</span> {noun(monitors.length, 'monitor')}
            </span>
            {alarms.map((state) => (
              <span key={state} className={HEALTH[state].color}>
                <span className="mono font-semibold">{count(state)}</span> {HEALTH[state].label.toLowerCase()}
              </span>
            ))}
            {alarms.length === 0 && <span className="text-ok">all up</span>}
          </>
        ) : (
          <Skeleton className="h-7 w-48" />
        )}
      </div>

      {/* The shared time axis: where the period starts, the releases inside it, and now. */}
      <div className={cn('sticky top-11 z-10 grid items-center gap-x-3 border-b bg-background px-3 max-lg:h-11 max-lg:grid-cols-[minmax(0,1fr)_auto] lg:h-12 lg:gap-x-0 lg:px-4', COLUMNS)}>
        <span className="label-caps max-lg:hidden">Monitor</span>
        <span className="label-caps lg:hidden">Downtime since {dayTime(new Date(from), new Date(now))}</span>
        <div className="lg:hidden">{toggle}</div>
        <div className="relative mx-4 max-lg:hidden">
          <ReleaseLabels marks={marks} />
          <div className="relative h-1">
            <ReleaseRules marks={marks} />
          </div>
          <span className="label-caps flex justify-between">
            <span>{dayTime(new Date(from), new Date(now))}</span>
            <span>Now</span>
          </span>
        </div>
        <span className="label-caps text-right max-lg:hidden">Last 60 checks</span>
        <span className="label-caps text-right max-lg:hidden">Changed</span>
      </div>

      {!shown ? (
        <ListSkeleton />
      ) : (
        GROUPS.map((state) => {
          const rows = monitors.filter((monitor) => ready(monitor) && health.get(monitor.id)!.report.health === state)
          if (!rows.length) return null
          return (
            <section key={state} aria-label={GROUP_LABEL[state]}>
              <h2 className={cn('label-caps flex h-8 items-center gap-2 border-b bg-muted/60 px-3 font-semibold lg:px-4', isAlarm(state) && HEALTH[state].color)}>
                {GROUP_LABEL[state]}
                <span className="font-normal text-muted-foreground">{rows.length}</span>
              </h2>
              <ul>
                {rows.map((monitor) => (
                  <MonitorRow key={monitor.id} org={org} monitor={monitor} health={health.get(monitor.id)!} from={from} now={now} marks={marks} />
                ))}
              </ul>
            </section>
          )
        })
      )}
      {shown && pending.length > 0 && <ListSkeleton rows={pending.length} />}
      {list.hasNextPage && (
        <div className="px-3 py-4 lg:px-4">
          <Button onClick={() => void list.fetchNextPage()} aria-busy={list.isFetchingNextPage} className="max-lg:h-11">
            More monitors
          </Button>
        </div>
      )}
    </>
  )
}

function MonitorRow({ org, monitor, health, from, now, marks }: { org: string; monitor: Monitor; health: MonitorHealth; from: number; now: number; marks: Mark[] }) {
  const { report, checks } = health
  const state = report.health
  const loud = isAlarm(state)
  const line = healthLine(monitor, report, now)
  // A flapping monitor can be slow as well; the row says so beside the name.
  const alsoSlow = state === Health.flapping && report.slow
  return (
    <li className="border-b">
      <Link
        to="/$org/uptime-monitors/$monitorId"
        params={{ org, monitorId: String(monitor.id) }}
        className={cn('grid grid-cols-[minmax(0,1fr)_96px] items-center gap-x-3 px-3 py-3 transition-colors duration-100 hover:bg-accent/60 lg:gap-x-0 lg:px-4 lg:py-2', COLUMNS)}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <HealthGlyph health={state} />
            <span className="truncate font-medium">{monitor.name}</span>
            {alsoSlow && <span className={cn('label-caps shrink-0', HEALTH[Health.slow].color)}>{HEALTH[Health.slow].label}</span>}
          </div>
          <div className="mono mt-1 flex gap-2 pl-5 text-muted-foreground">
            {loud && <span className={cn('shrink-0 max-lg:hidden', HEALTH[state].color)}>{state === Health.down ? downReason(monitor, report) : line}</span>}
            <span className="truncate max-lg:hidden">{targetText(monitor)}</span>
            <span className={cn('truncate lg:hidden', loud && HEALTH[state].color)}>
              {line}
              {state === Health.up && report.typical !== undefined && ` · ${responseText(report.typical)}`}
            </span>
          </div>
        </div>
        <DowntimeStrip downtimes={report.downtimes} from={from} to={now} marks={marks} waiting={state === Health.waiting} className="lg:mx-4" />
        <span className="flex items-center justify-end gap-3 max-lg:hidden">
          {!isHeartbeat(monitor) && checks.length > 0 && <CheckBars checks={checks} timeout={monitor.timeout} height={20} className="w-30" />}
          <span className={cn('mono w-14 text-right', (state === Health.slow || alsoSlow) && cn('font-semibold', HEALTH[Health.slow].color))}>{responseText(report.typical)}</span>
        </span>
        <time className="mono text-right text-muted-foreground max-lg:hidden" dateTime={monitor.lastChange ?? undefined} title={monitor.lastChange ? exact(monitor.lastChange) : undefined}>
          {monitor.lastChange && monitor.isUp !== null ? ago(monitor.lastChange, new Date(now)) : ''}
        </time>
      </Link>
    </li>
  )
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy aria-label="Loading monitors">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={cn('grid grid-cols-[minmax(0,1fr)_96px] items-center gap-x-3 border-b px-3 py-3 lg:gap-x-0 lg:px-4', COLUMNS)}>
          <span className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 max-lg:w-32" />
          </span>
          <Skeleton className="h-5 lg:mx-4" />
          <Skeleton className="h-5 max-lg:hidden" />
          <Skeleton className="ml-auto h-4 w-10 max-lg:hidden" />
        </div>
      ))}
    </div>
  )
}
