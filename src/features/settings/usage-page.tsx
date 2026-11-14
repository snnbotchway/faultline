import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import { Scope, instanceSettingsQuery, organizationQuery, projectsQuery } from '@/api/organizations'
import { USAGE_DAYS, USAGE_KINDS, isProjectKind, licenseEmailQuery, totalOf, usageDaysQuery, usagePeriodQuery, type UsageDay } from '@/api/usage'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHotkeys } from '@/lib/hotkeys'
import { plural } from '@/lib/text'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { useAccess } from './access'
import { DayBars, type DayPick } from './day-bars'
import { SettingsBar, Sheet } from './parts'
import { useFold } from './rows'
import { DropRows } from './usage-drops'
import { ProjectRows } from './usage-projects'
import { FIGURES, FigureRow, GRID, SHARE, SLOT } from './usage-rows'
import { KIND_LABEL, KIND_WORD, exactCount, organizationDropRate, share, stepDay } from './usage'

const DROPPED = 'dropped'
const TODAY = 'Today'
const PERIOD = `${USAGE_DAYS} days`

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
const dayName = (date: string) => dayFormat.format(new Date(`${date}T00:00:00Z`))
const dayLabel = (days: UsageDay[], index: number) => (index === days.length - 1 ? TODAY : dayName(days[index]!.date))

export function UsagePage({ org }: { org: string }) {
  useTitle('Usage', org)
  const can = useAccess(org)
  const period = useQuery(usagePeriodQuery(org))
  const usage = useQuery(usageDaysQuery(org))
  const organization = useQuery(organizationQuery(org)).data
  const projects = useQuery(projectsQuery(org)).data
  const paid = useQuery(instanceSettingsQuery).data?.iPaidForGlitchTip === true
  const licenseEmail = useQuery({ ...licenseEmailQuery, enabled: paid }).data
  const [pinned, setPinned] = useState<number>()
  const [hovered, setHovered] = useState<number>()
  const row = useFold()
  const days = usage.data
  const totals = period.data
  const step = (by: -1 | 1) => days && setPinned(stepDay(pinned, by, days.length))
  useHotkeys({ ArrowLeft: () => step(-1), ArrowRight: () => step(1), Escape: () => setPinned(undefined) })

  const bar = <SettingsBar org={org} title="Usage" />
  if (usage.isError || period.isError)
    return (
      <>
        {bar}
        <Screen title="Usage didn't load">
          <Button onClick={() => void Promise.all([usage.refetch(), period.refetch()])}>Try again</Button>
        </Screen>
      </>
    )
  if (!days || !totals || !organization || !projects)
    return (
      <>
        {bar}
        <Sheet>
          <UsageSkeleton />
        </Sheet>
      </>
    )

  const organizationRate = organizationDropRate(organization)
  const drops = (
    <DropRows org={org} organization={organizationRate} accepting={organization.isAcceptingEvents} projects={projects} open={row.is(DROPPED)} onToggle={() => row.toggle(DROPPED)} />
  )
  if (totalOf(totals) === 0)
    return (
      <>
        {bar}
        <Sheet className="flex flex-col">
          {/* Dropping everything is one reason there is nothing to show. */}
          {drops}
          <Screen title={`No events in the last ${PERIOD}`}>
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
  const counts = picked === undefined ? totals : days[picked]!.counts
  const pick: DayPick = { picked, hover: setHovered, pin: (index, toggle) => setPinned(toggle && pinned === index ? undefined : index) }
  const allBuckets = days.map((day) => totalOf(day.counts))

  return (
    <>
      {bar}
      <Sheet>
        <AxisHeader days={days} picked={picked} pinned={pinned} onStep={step} onClear={() => setPinned(undefined)} />

        <section aria-label="All events" className={cn(GRID, 'items-end border-b bg-card py-5')}>
          <div>
            <p className={FIGURES}>
              <span className="min-w-0 flex-1 font-medium">All events</span>
              <strong className="mono text-2xl leading-none font-semibold lg:text-3xl">{exactCount(totalOf(counts))}</strong>
              <span className={SHARE} />
              <span className={SLOT} />
            </p>
            <p className="mono mt-1 text-xs text-muted-foreground">peak {exactCount(Math.max(...allBuckets, 0))}/day</p>
          </div>
          <DayBars label="All events a day" buckets={allBuckets} height={64} picked={picked} pick={pick} className="max-lg:mt-3" />
        </section>

        {drops}

        {USAGE_KINDS.map((kind) => {
          const foldable = isProjectKind(kind) && projects.length > 0
          const open = foldable && row.is(kind)
          const buckets = days.map((day) => day.counts[kind])
          return (
            <section key={kind} aria-label={KIND_LABEL[kind]} className={cn('border-b', open && 'bg-card')}>
              <FigureRow
                className="items-end py-3"
                open={open}
                onToggle={foldable ? () => row.toggle(kind) : undefined}
                figures={
                  <>
                    <span className="min-w-0 flex-1 font-medium">{KIND_LABEL[kind]}</span>
                    <strong className="mono font-semibold">{exactCount(counts[kind])}</strong>
                    <span className={SHARE}>{share(counts[kind], totalOf(counts))}</span>
                  </>
                }
                aside={<DayBars label={`${KIND_LABEL[kind]} a day`} buckets={buckets} height={32} picked={picked} pick={pick} className="max-lg:mt-2" />}
              />
              {open && isProjectKind(kind) && (
                <ProjectRows
                  org={org}
                  kind={kind}
                  projects={projects}
                  organizationRate={organizationRate}
                  days={days}
                  picked={picked}
                  peak={Math.max(...buckets, 0)}
                  total={counts[kind]}
                />
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

function AxisHeader({ days, picked, pinned, onStep, onClear }: { days: UsageDay[]; picked: number | undefined; pinned: number | undefined; onStep: (by: -1 | 1) => void; onClear: () => void }) {
  const pinnedDay = pinned === undefined ? undefined : days[pinned]
  return (
    <div className={cn(GRID, 'sticky top-11 z-10 items-center border-b bg-muted max-lg:pb-1')}>
      <div className="flex h-11 items-center lg:h-9">
        <h2 className="label-caps w-28 whitespace-nowrap">{picked === undefined ? `Last ${PERIOD}` : dayLabel(days, picked)}</h2>
        {pinned !== undefined && (
          <>
            <Button variant="ghost" size="icon-sm" className="max-lg:size-11" aria-label="Previous day" disabled={pinned === 0} onClick={() => onStep(-1)}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon-sm" className="max-lg:size-11" aria-label="Next day" disabled={pinned === days.length - 1} onClick={() => onStep(1)}>
              <ChevronRight />
            </Button>
            <Button size="bar" className="ml-auto gap-1" onClick={onClear}>
              <X className="size-3" />
              All {PERIOD}
            </Button>
          </>
        )}
      </div>
      <div className="mono flex justify-between text-xs text-muted-foreground" aria-hidden>
        <span>{dayName(days[0]!.date)}</span>
        <span>{dayName(days[Math.floor(days.length / 2)]!.date)}</span>
        <span>{TODAY}</span>
      </div>
      <p className="sr-only" aria-live="polite">
        {pinnedDay &&
          `${dayLabel(days, pinned!)}: ${plural(exactCount(totalOf(pinnedDay.counts)), 'event')}. ${USAGE_KINDS.map((kind) => plural(exactCount(pinnedDay.counts[kind]), ...KIND_WORD[kind])).join(', ')}.`}
      </p>
    </div>
  )
}

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
