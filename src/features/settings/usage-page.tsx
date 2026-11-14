import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Scope, instanceSettingsQuery, organizationQuery, projectsQuery } from '@/api/organizations'
import type { Project } from '@/api/projects'
import { USAGE_KINDS, UsageKind, isProjectKind, licenseEmailQuery, projectUsageQuery, sumDays, totalOf, usageDaysQuery, type ProjectKind, type UsageDay } from '@/api/usage'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { RowButton } from '@/components/ui/row-button'
import { Skeleton } from '@/components/ui/skeleton'
import { barHeights } from '@/features/issues/trend'
import { useHotkeys } from '@/lib/hotkeys'
import { plural } from '@/lib/text'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { useAccess } from './access'
import { FoldChevron, SettingsBar, Sheet } from './parts'
import { ProjectTab } from './project-tabs'
import { useFold } from './rows'
import { dayAt, dropRange, effectiveDropRate, exactCount, rangeText, share, stepDay } from './usage'

const KIND_LABEL: Record<UsageKind, string> = { errors: 'Errors', transactions: 'Transactions', logs: 'Logs', uptime: 'Uptime checks' }
const KIND_WORD: Record<UsageKind, [one: string, many: string]> = {
  errors: ['error', 'errors'],
  transactions: ['transaction', 'transactions'],
  logs: ['log', 'logs'],
  uptime: ['uptime check', 'uptime checks'],
}
const DROPPED = 'dropped'

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
const dayName = (date: string) => dayFormat.format(new Date(`${date}T00:00:00Z`))

// Every row is a name with its figures, then its chart: side by side on a desktop, stacked on a phone.
const GRID = 'grid gap-x-6 px-3 md:px-4 lg:grid-cols-[20rem_minmax(0,1fr)]'
// A row's figures sit in the same columns whatever the row: the count, its share, then the chevron.
const FIGURES = 'flex w-full items-baseline gap-3 text-left'
const SHARE = 'mono w-10 shrink-0 text-right text-muted-foreground'
const SLOT = 'flex size-4 shrink-0 items-center self-center'
// A finger has to travel this far sideways before it is dragging across the days rather than tapping one.
const DRAG_START_PX = 8

type Pick = { picked: number | undefined; hover: (index: number | undefined) => void; pin: (index: number, toggle: boolean) => void }

/**
 * Counts per day as bars on the shared 30-day axis. With `pick` a mouse shows the day under it and a click keeps it;
 * a finger keeps the day it taps or drags to, and the page still scrolls up and down under it. Without, it only draws.
 */
function DayBars({ label, buckets, height, peak, picked, pick, className }: { label: string; buckets: number[]; height: number; peak?: number; picked: number | undefined; pick?: Pick; className?: string }) {
  const touchStart = useRef<number>(undefined)
  const heights = barHeights(buckets, height, peak)
  const at = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    return dayAt(event.clientX, box.left, box.width, buckets.length)
  }
  const mouse = (event: PointerEvent) => event.pointerType === 'mouse'
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('flex items-end gap-px border-b border-grid', pick && 'cursor-pointer touch-pan-y', className)}
      style={{ height: height + 1 }}
      {...(pick && {
        // A click here picks a day; it must not also fold the row the chart sits in.
        onClick: (event) => event.stopPropagation(),
        onPointerDown: (event) => {
          if (!mouse(event)) touchStart.current = event.clientX
        },
        onPointerMove: (event) => {
          if (mouse(event)) pick.hover(at(event))
          else if (touchStart.current !== undefined && Math.abs(event.clientX - touchStart.current) > DRAG_START_PX) pick.pin(at(event), false)
        },
        onPointerUp: (event) => {
          if (mouse(event)) pick.pin(at(event), true)
          else if (touchStart.current !== undefined) pick.pin(at(event), false)
          touchStart.current = undefined
        },
        // The browser took the gesture to scroll the page.
        onPointerCancel: () => (touchStart.current = undefined),
        onPointerLeave: () => pick.hover(undefined),
      })}
    >
      {heights.map((barHeight, index) => (
        <span key={index} className={cn('flex h-full min-w-0 flex-1 items-end', picked === index && 'bg-selected')}>
          <span className={cn('w-full', picked === index ? 'bg-foreground' : 'bg-foreground/50', picked !== undefined && picked !== index && 'dimmed')} style={{ height: barHeight }} />
        </span>
      ))}
    </div>
  )
}

// A warning's shape, as the level glyphs draw it, so a drop rate is never colour alone.
function DropGlyph() {
  return (
    <svg viewBox="0 0 10 10" aria-hidden className="size-3 shrink-0 self-center text-level-warning">
      <path d="M5 0.5 10 9.5H0Z" fill="currentColor" />
    </svg>
  )
}

/**
 * What an organization took in over the last 30 days: every kind of event on one time axis, with the projects behind
 * the errors and the transactions, and the share of new events being dropped. Picking a day turns every figure into
 * that day's. This is the stock subscription page of an instance without billing.
 */
export function UsagePage({ org }: { org: string }) {
  useTitle('Usage', org)
  const can = useAccess(org)
  const usage = useQuery(usageDaysQuery(org))
  const organization = useQuery(organizationQuery(org)).data
  const projects = useQuery(projectsQuery(org)).data
  const paid = useQuery(instanceSettingsQuery).data?.iPaidForGlitchTip === true
  const licenseEmail = useQuery({ ...licenseEmailQuery, enabled: paid }).data
  const [pinned, setPinned] = useState<number>()
  const [hovered, setHovered] = useState<number>()
  const row = useFold()
  const days = usage.data
  const step = (by: -1 | 1) => days && setPinned(stepDay(pinned, by, days.length))
  useHotkeys({ ArrowLeft: () => step(-1), ArrowRight: () => step(1), Escape: () => setPinned(undefined) })

  const bar = <SettingsBar org={org} title="Usage" />
  if (usage.isError)
    return (
      <>
        {bar}
        <Screen title="Usage didn't load">
          <Button onClick={() => void usage.refetch()}>Try again</Button>
        </Screen>
      </>
    )
  if (!days || !organization || !projects)
    return (
      <>
        {bar}
        <Sheet>
          <UsageSkeleton />
        </Sheet>
      </>
    )

  const organizationRate = organization.eventThrottleRate ?? 0
  const drops = <DropRows org={org} organization={organizationRate} projects={projects} open={row.is(DROPPED)} onToggle={() => row.toggle(DROPPED)} />
  const totals = sumDays(days)
  if (totalOf(totals) === 0)
    return (
      <>
        {bar}
        <Sheet className="flex flex-col">
          {/* Dropping everything is one reason there is nothing to show. */}
          {(organizationRate > 0 || projects.some((project) => (project.eventThrottleRate ?? 0) > 0)) && drops}
          <Screen title="No events in the last 30 days">
            {projects.length === 0 && can(Scope.projectWrite) && (
              <Button asChild>
                <Link to="/$org/settings/projects/new" params={{ org }}>
                  New project
                </Link>
              </Button>
            )}
          </Screen>
        </Sheet>
      </>
    )

  const picked = hovered ?? pinned
  const pickedDay = picked === undefined ? undefined : days[picked]
  const pinnedDay = pinned === undefined ? undefined : days[pinned]
  const counts = pickedDay ? pickedDay.counts : totals
  const pick: Pick = { picked, hover: setHovered, pin: (index, toggle) => setPinned(toggle && pinned === index ? undefined : index) }
  const allBuckets = days.map((day) => totalOf(day.counts))
  const label = (index: number) => (index === days.length - 1 ? 'Today' : dayName(days[index]!.date))

  return (
    <>
      {bar}
      <Sheet>
        <div className={cn(GRID, 'sticky top-11 z-10 items-center border-b bg-muted max-lg:pb-1')}>
          <div className="flex h-11 items-center lg:h-9">
            <h2 className="label-caps w-28 whitespace-nowrap">{picked === undefined ? 'Last 30 days' : label(picked)}</h2>
            {pinned !== undefined && (
              <>
                <Button variant="ghost" size="icon-sm" className="max-lg:size-11" aria-label="Previous day" disabled={pinned === 0} onClick={() => step(-1)}>
                  <ChevronLeft />
                </Button>
                <Button variant="ghost" size="icon-sm" className="max-lg:size-11" aria-label="Next day" disabled={pinned === days.length - 1} onClick={() => step(1)}>
                  <ChevronRight />
                </Button>
                <Button size="bar" className="ml-auto gap-1" onClick={() => setPinned(undefined)}>
                  <X className="size-3" />
                  All 30 days
                </Button>
              </>
            )}
          </div>
          <div className="mono flex justify-between text-xs text-muted-foreground" aria-hidden>
            <span>{dayName(days[0]!.date)}</span>
            <span>{dayName(days[Math.floor(days.length / 2)]!.date)}</span>
            <span>Today</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {pinnedDay &&
              `${label(pinned!)}: ${plural(exactCount(totalOf(pinnedDay.counts)), 'event')}. ${USAGE_KINDS.map((kind) => plural(exactCount(pinnedDay.counts[kind]), ...KIND_WORD[kind])).join(', ')}.`}
          </p>
        </div>

        <section aria-label="All events" className={cn(GRID, 'items-end border-b bg-card py-5')}>
          <div>
            <p className={FIGURES}>
              <span className="min-w-0 flex-1 font-medium">All events</span>
              <span className="mono text-2xl leading-none font-semibold lg:text-3xl">{exactCount(totalOf(counts))}</span>
              <span className={SHARE} />
              <span className={SLOT} />
            </p>
            <Peak buckets={allBuckets} />
          </div>
          <DayBars label="All events a day" buckets={allBuckets} height={64} picked={picked} pick={pick} className="max-lg:mt-3" />
        </section>

        {drops}

        {USAGE_KINDS.map((kind) => {
          const foldable = isProjectKind(kind) && projects.length > 0
          const open = foldable && row.is(kind)
          const buckets = days.map((day) => day.counts[kind])
          const figures = (
            <>
              <span className="min-w-0 flex-1 font-medium">{KIND_LABEL[kind]}</span>
              <span className="mono font-semibold">{exactCount(counts[kind])}</span>
              <span className={SHARE}>{share(counts[kind], totalOf(counts))}</span>
              <span className={SLOT}>{foldable && <FoldChevron open={open} />}</span>
            </>
          )
          return (
            <section key={kind} aria-label={KIND_LABEL[kind]} className={cn('border-b', open && 'bg-card')}>
              <div className={cn(GRID, 'items-end py-3', foldable && 'cursor-pointer hover:bg-accent')} onClick={foldable ? () => row.toggle(kind) : undefined}>
                <div>
                  {foldable ? (
                    // A click on the button reaches the row, which folds; the row is the larger target.
                    <button type="button" aria-expanded={open} className={cn(FIGURES, 'cursor-pointer -outline-offset-2')}>
                      {figures}
                    </button>
                  ) : (
                    <p className={FIGURES}>{figures}</p>
                  )}
                  <Peak buckets={buckets} />
                </div>
                <DayBars label={`${KIND_LABEL[kind]} a day`} buckets={buckets} height={32} picked={picked} pick={pick} className="max-lg:mt-2" />
              </div>
              {open && isProjectKind(kind) && (
                <ProjectRows org={org} kind={kind} projects={projects} organizationRate={organizationRate} days={days} picked={picked} peak={Math.max(...buckets, 0)} />
              )}
            </section>
          )
        })}

        {paid && licenseEmail && (
          <div className={cn(GRID, 'min-h-12 items-center border-b py-2 lg:min-h-11')}>
            <span className="font-medium">Billing email</span>
            <a href={`mailto:${licenseEmail}`} className="mono [overflow-wrap:anywhere] text-brand underline-offset-4 hover:underline">
              {licenseEmail}
            </a>
          </div>
        )}
      </Sheet>
    </>
  )
}

function Peak({ buckets }: { buckets: number[] }) {
  return <p className="mono mt-1 text-xs text-muted-foreground">peak {exactCount(Math.max(...buckets, 0))}/day</p>
}

const PROJECT_ROW = 'min-h-11 items-center border-t py-2 hover:bg-accent lg:min-h-9 lg:py-1'

// The projects behind one kind, busiest first, each drawn on the kind's own scale so their bars compare.
function ProjectRows({
  org,
  kind,
  projects,
  organizationRate,
  days,
  picked,
  peak,
}: {
  org: string
  kind: ProjectKind
  projects: Project[]
  organizationRate: number
  days: UsageDay[]
  picked: number | undefined
  peak: number
}) {
  const ids = projects.map((project) => String(project.id))
  const usage = useQuery(projectUsageQuery(org, kind, ids))
  if (usage.isError)
    return (
      <div className={cn(GRID, 'min-h-11 items-center border-t')}>
        <span className="flex items-center justify-between gap-3">
          The projects didn't load
          <RowButton onClick={() => void usage.refetch()}>Try again</RowButton>
        </span>
      </div>
    )
  if (!usage.data)
    return (
      <div aria-busy>
        {projects.slice(0, 3).map((project) => (
          <div key={project.id} className={cn(GRID, 'min-h-11 items-center border-t lg:min-h-9')}>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 max-lg:hidden" />
          </div>
        ))}
      </div>
    )
  const pickedDate = picked === undefined ? undefined : days[picked]?.date
  const rows = projects
    .map((project) => {
      const byDay = usage.data[String(project.id)] ?? {}
      const buckets = days.map((day) => byDay[day.date] ?? 0)
      return { project, buckets, count: pickedDate ? (byDay[pickedDate] ?? 0) : buckets.reduce((sum, count) => sum + count, 0) }
    })
    .sort((a, b) => b.count - a.count)
  const whole = rows.reduce((sum, item) => sum + item.count, 0)
  return (
    <ul aria-label={`${KIND_LABEL[kind]} by project`}>
      {rows.map(({ project, buckets, count }) => {
        const dropped = effectiveDropRate(organizationRate, project.eventThrottleRate ?? 0)
        return (
          <li key={project.id}>
            <Link to="/$org/settings/projects/$project" params={{ org, project: project.slug ?? '' }} className={cn(GRID, PROJECT_ROW)}>
              <span className={FIGURES}>
                <span className="min-w-0 flex-1">
                  <span className="mono block [overflow-wrap:anywhere]">{project.slug}</span>
                  {dropped > 0 && (
                    <span className="flex items-baseline gap-1 text-sm">
                      <DropGlyph />
                      <span className="mono">{dropped}%</span> dropped
                    </span>
                  )}
                </span>
                <span className="mono">{exactCount(count)}</span>
                <span className={SHARE}>{share(count, whole)}</span>
                <span className={SLOT}>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </span>
              </span>
              <DayBars label={`${project.slug} a day`} buckets={buckets} height={16} peak={peak} picked={picked} className="max-lg:mt-2" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

// What a project's rate is made of, for the line beside it.
function dropSource(organization: number, project: number): string {
  if (organization > 0 && project > 0) return `${organization}% for the organization, then ${project}% of the rest for this project`
  return organization > 0 ? 'Set for the organization' : project > 0 ? 'Set for this project' : ''
}

/**
 * The share of new events being dropped, which is the only limit an instance without billing has. With a rate set
 * it leads with the figure and unfolds to each project's own, since a project's rate applies on top of the
 * organization's.
 */
function DropRows({ org, organization, projects, open, onToggle }: { org: string; organization: number; projects: Project[]; open: boolean; onToggle: () => void }) {
  const range = dropRange(
    organization,
    projects.map((project) => project.eventThrottleRate ?? 0),
  )
  const dropping = range.max > 0
  const foldable = dropping && projects.length > 0
  const unfolded = foldable && open
  const figures: ReactNode = (
    <>
      <span className="min-w-0 flex-1 font-medium">Events dropped</span>
      {dropping ? (
        <span className="flex items-baseline gap-2">
          <DropGlyph />
          <span className="mono font-semibold">{rangeText(range)}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">None</span>
      )}
      <span className={SLOT}>{foldable && <FoldChevron open={unfolded} />}</span>
    </>
  )
  return (
    <section aria-label="Events dropped" className={cn('border-b', unfolded && 'bg-card')}>
      <div className={cn(GRID, 'min-h-12 items-center py-2 lg:min-h-11', foldable && 'cursor-pointer hover:bg-accent')} onClick={foldable ? onToggle : undefined}>
        {foldable ? (
          <button type="button" aria-expanded={unfolded} className={cn(FIGURES, 'cursor-pointer -outline-offset-2')}>
            {figures}
          </button>
        ) : (
          <p className={FIGURES}>{figures}</p>
        )}
        {dropping && <span className="text-muted-foreground max-lg:mt-1">{range.min === range.max ? 'of new events, in every project' : 'of new events, depending on the project'}</span>}
      </div>
      {unfolded && (
        <ul aria-label="Events dropped by project">
          {projects
            .map((project) => ({ project, own: project.eventThrottleRate ?? 0, rate: effectiveDropRate(organization, project.eventThrottleRate ?? 0) }))
            .sort((a, b) => b.rate - a.rate)
            .map(({ project, own, rate }) => (
              <li key={project.id}>
                <Link to="/$org/settings/projects/$project" params={{ org, project: project.slug ?? '' }} search={{ tab: ProjectTab.general }} className={cn(GRID, PROJECT_ROW)}>
                  <span className={FIGURES}>
                    <span className="mono min-w-0 flex-1 [overflow-wrap:anywhere]">{project.slug}</span>
                    <span className={cn('mono', rate === 0 && 'text-muted-foreground')}>{rate}%</span>
                    <span className={SLOT}>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">{dropSource(organization, own)}</span>
                </Link>
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}

// The page's shape while it loads: the axis, the headline row, then a row a kind.
function UsageSkeleton() {
  return (
    <div aria-busy>
      <div className={cn(GRID, 'h-11 items-center border-b bg-muted lg:h-9')}>
        <Skeleton className="h-3 w-24 bg-accent" />
      </div>
      {[true, ...USAGE_KINDS.map(() => false)].map((tall, index) => (
        <div key={index} className={cn(GRID, 'items-end border-b py-3', tall && 'py-5')}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className={cn('max-lg:mt-3', tall ? 'h-16' : 'h-8')} />
        </div>
      ))}
    </div>
  )
}
