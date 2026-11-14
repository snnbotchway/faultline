// PROTOTYPE, not production. Four variants of the usage page on /:org/settings/subscription, switched with
// `?variant=` (ledger, timeline, projects, table) and the floating bar at the bottom. `revised` is the direction picked
// from them (the timeline, with the ledger's project rows unfolding under errors and transactions) and is the default.
// `?drops=1` fakes drop rates, which the demo data has none of.
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Gauge, X } from 'lucide-react'
import { useEffect, useState, type PointerEvent } from 'react'
import { instanceSettingsQuery, organizationQuery, projectsQuery } from '@/api/organizations'
import { USAGE_CATEGORIES, UsageCategory, licenseEmailQuery, projectUsageQuery, totalOf, usageDailyQuery, usagePeriodQuery, type UsageCounts, type UsageDay } from '@/api/usage'
import { Section, Stat } from '@/components/ui/section'
import { Trace } from '@/features/issues/trace'
import { plural } from '@/lib/text'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { FoldChevron, Group, ROW, Row, RowSkeleton, SettingsBar, Sheet } from './parts'
import { useFold } from './rows'

export const UsageVariant = { revised: 'revised', ledger: 'ledger', timeline: 'timeline', projects: 'projects', table: 'table' } as const
export type UsageVariant = (typeof UsageVariant)[keyof typeof UsageVariant]
const VARIANTS = Object.values(UsageVariant)
const VARIANT_NAMES: Record<UsageVariant, string> = {
  revised: 'The pick: timeline with unfolding projects',
  ledger: 'Totals, then unfold a kind',
  timeline: 'One time axis, pick a day',
  projects: 'Which project is noisy',
  table: 'Figures and a table of days',
}
export const toUsageVariant = (value: unknown): UsageVariant => (VARIANTS.includes(value as UsageVariant) ? (value as UsageVariant) : UsageVariant.revised)

const LABELS: Record<UsageCategory, string> = { errors: 'Errors', transactions: 'Transactions', logs: 'Logs', uptime: 'Uptime checks' }

const numberFormat = new Intl.NumberFormat('en')
const n = (count: number) => numberFormat.format(count)
const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
const day = (date: string) => dayFormat.format(new Date(`${date}T00:00:00Z`))
const percent = (part: number, whole: number) => (whole <= 0 ? '0%' : part > 0 && part / whole < 0.01 ? '<1%' : `${Math.round((part / whole) * 100)}%`)

type ProjectRow = { id: string; slug: string; errors: number; transactions: number; total: number; buckets: number[]; days: Record<string, { errors: number; transactions: number }>; dropped: number }
type Usage = {
  counts: UsageCounts
  total: number
  previousTotal: number
  days: UsageDay[]
  projects: ProjectRow[] | undefined
  // Percent of new events the organization drops before any project's own share.
  dropped: number
  licenseEmail: string | undefined
}

function useUsage(org: string): Usage | undefined {
  const counts = useQuery(usagePeriodQuery(org)).data
  const previous = useQuery(usagePeriodQuery(org, 1)).data
  const days = useQuery(usageDailyQuery(org)).data
  const organization = useQuery(organizationQuery(org)).data
  const projects = useQuery(projectsQuery(org)).data
  const ids = projects?.map((project) => String(project.id)) ?? []
  const perProject = useQuery({ ...projectUsageQuery(org, ids), enabled: ids.length > 0 }).data
  const paid = useQuery(instanceSettingsQuery).data?.iPaidForGlitchTip === true
  const licenseEmail = useQuery({ ...licenseEmailQuery, enabled: paid }).data
  if (!counts || !previous || !days || !organization) return undefined
  return {
    counts,
    total: totalOf(counts),
    previousTotal: totalOf(previous),
    days,
    dropped: organization.eventThrottleRate ?? 0,
    licenseEmail: (paid && licenseEmail) || undefined,
    projects:
      projects && (perProject || ids.length === 0)
        ? projects
            .map((project) => {
              const usage = perProject?.find((row) => row.id === String(project.id))
              return {
                id: String(project.id),
                slug: project.slug ?? '',
                errors: usage?.errors ?? 0,
                transactions: usage?.transactions ?? 0,
                total: (usage?.errors ?? 0) + (usage?.transactions ?? 0),
                buckets: days.map((entry) => (usage?.days[entry.date]?.errors ?? 0) + (usage?.days[entry.date]?.transactions ?? 0)),
                days: usage?.days ?? {},
                dropped: project.eventThrottleRate ?? 0,
              }
            })
            .sort((a, b) => b.total - a.total)
        : undefined,
  }
}

export function UsagePrototype({ org, variant, fakeDrops }: { org: string; variant: UsageVariant; fakeDrops?: boolean }) {
  useTitle('Usage', org)
  const usage = useUsage(org)
  return (
    <>
      <SettingsBar org={org} title="Usage">
        <span className="mono text-muted-foreground">Last 30 days</span>
      </SettingsBar>
      <Sheet className="pb-24">
        {!usage ? (
          <RowSkeleton rows={6} />
        ) : variant === UsageVariant.revised ? (
          <Revised org={org} usage={fakeDrops ? { ...usage, dropped: 25, projects: usage.projects?.map((project, index) => (index === 1 ? { ...project, dropped: 10 } : project)) } : usage} />
        ) : variant === UsageVariant.ledger ? (
          <Ledger org={org} usage={usage} />
        ) : variant === UsageVariant.timeline ? (
          <Timeline usage={usage} />
        ) : variant === UsageVariant.projects ? (
          <Projects org={org} usage={usage} />
        ) : (
          <DayTable usage={usage} />
        )}
      </Sheet>
      {import.meta.env.DEV && <PrototypeSwitcher org={org} current={variant} />}
    </>
  )
}

// A share of a whole as a plain bar on a baseline.
function ShareBar({ part, whole, className }: { part: number; whole: number; className?: string }) {
  return (
    <span className={cn('block h-2 bg-grid', className)} aria-hidden>
      <span className="block h-full bg-foreground/50" style={{ width: whole > 0 ? `${Math.max(part > 0 ? 1 : 0, (part / whole) * 100)}%` : 0 }} />
    </span>
  )
}

const dropText = (usage: Usage) => {
  const parts = [
    ...(usage.dropped > 0 ? [`${usage.dropped}% everywhere`] : []),
    ...(usage.projects ?? []).filter((project) => project.dropped > 0).map((project) => `${project.dropped}% in ${project.slug}`),
  ]
  return parts.length ? parts.join(', ') : 'None'
}

function Change({ usage }: { usage: Usage }) {
  if (usage.previousTotal <= 0) return null
  const change = Math.round(((usage.total - usage.previousTotal) / usage.previousTotal) * 100)
  return (
    <span className="mono text-muted-foreground">
      {change > 0 ? `${change}% more` : change < 0 ? `${-change}% fewer` : 'the same'} than the 30 days before ({n(usage.previousTotal)})
    </span>
  )
}

const AXIS = 'mono flex justify-between text-xs text-muted-foreground'
function AxisLabels({ days, className }: { days: UsageDay[]; className?: string }) {
  return (
    <div className={cn(AXIS, className)} aria-hidden>
      <span>{day(days[0]!.date)}</span>
      <span>{day(days[Math.floor(days.length / 2)]!.date)}</span>
      <span>Today</span>
    </div>
  )
}

// ---- A. Ledger: the total first, then one row per kind that unfolds to its days and its projects. ----

function Ledger({ org, usage }: { org: string; usage: Usage }) {
  const row = useFold()
  return (
    <>
      <div className="flex flex-col gap-2 border-b px-3 py-5 md:px-4">
        <p className="flex items-baseline gap-2">
          <span className="mono text-2xl leading-none font-semibold lg:text-3xl">{n(usage.total)}</span>
          <span className="text-muted-foreground">events</span>
        </p>
        <Change usage={usage} />
      </div>
      <Group label="By kind">
        {USAGE_CATEGORIES.map((category) => {
          const open = row.is(category)
          const count = usage.counts[category]
          const split = category === UsageCategory.errors || category === UsageCategory.transactions
          const buckets = usage.days.map((entry) => entry.counts[category])
          return (
            <div key={category} className={cn(open && 'bg-card')}>
              <button type="button" aria-expanded={open} onClick={() => row.toggle(category)} className={cn(ROW, 'cursor-pointer hover:bg-accent', open && 'border-b-0')}>
                <span className="w-36 shrink-0 font-medium lg:w-52">{LABELS[category]}</span>
                <span className="mono w-16 shrink-0 text-right lg:w-20">{n(count)}</span>
                <ShareBar part={count} whole={usage.total} className="min-w-0 flex-1" />
                <span className="mono w-10 shrink-0 text-right text-muted-foreground">{percent(count, usage.total)}</span>
                <FoldChevron open={open} />
              </button>
              {open && (
                <div className="flex flex-col gap-4 border-b px-3 pt-1 pb-4 md:px-4 lg:pl-59">
                  <div>
                    <p className="mono mb-2 text-xs text-muted-foreground">peak {n(Math.max(...buckets, 0))}/day</p>
                    <Trace buckets={buckets} height={40} />
                    <AxisLabels days={usage.days} className="mt-1" />
                  </div>
                  {split && usage.projects && (
                    <ul aria-label={`${LABELS[category]} by project`}>
                      {usage.projects
                        .map((project) => ({ ...project, count: category === UsageCategory.errors ? project.errors : project.transactions }))
                        .sort((a, b) => b.count - a.count)
                        .map((project) => (
                          <li key={project.id}>
                            <Link
                              to="/$org/settings/projects/$project"
                              params={{ org, project: project.slug }}
                              className="flex min-h-11 items-center gap-3 border-t hover:bg-accent lg:min-h-9"
                            >
                              <span className="mono min-w-0 flex-1 truncate">{project.slug}</span>
                              <ShareBar part={project.count} whole={count} className="w-24 lg:w-48" />
                              <span className="mono w-16 shrink-0 text-right">{n(project.count)}</span>
                              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            </Link>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </Group>
      <Group label="Limits">
        <Row label="Events dropped" value={dropText(usage)} />
      </Group>
      {usage.licenseEmail && (
        <Group label="Support license">
          <Row label="Billing email" mono value={<span className="[overflow-wrap:anywhere]">{usage.licenseEmail}</span>} />
        </Group>
      )}
    </>
  )
}

// ---- B. Timeline: every kind on one shared time axis; picking a day turns every figure into that day's. ----

function PickBars({ buckets, height, picked, onPick }: { buckets: number[]; height: number; picked: number | undefined; onPick: (index: number | undefined) => void }) {
  const peak = Math.max(...buckets, 0)
  return (
    <div className="flex items-end gap-px border-b border-grid" style={{ height: height + 1 }} onMouseLeave={() => onPick(undefined)}>
      {buckets.map((count, index) => (
        <button
          key={index}
          type="button"
          tabIndex={-1}
          aria-hidden
          onMouseEnter={() => onPick(index)}
          onClick={() => onPick(picked === index ? undefined : index)}
          className={cn('flex h-full min-w-0 flex-1 cursor-pointer items-end', picked === index && 'bg-selected')}
        >
          <span
            className={cn('w-full bg-foreground/50', picked !== undefined && picked !== index && 'dimmed', picked === index && 'bg-foreground')}
            style={{ height: count <= 0 || peak <= 0 ? 0 : Math.max(2, Math.round((count / peak) * height)) }}
          />
        </button>
      ))}
    </div>
  )
}

function Timeline({ usage }: { usage: Usage }) {
  const [picked, setPicked] = useState<number>()
  const pickedDay = picked === undefined ? undefined : usage.days[picked]
  const lines: { key: string; label: string; buckets: number[]; count: number; height: number }[] = [
    { key: 'all', label: 'All events', buckets: usage.days.map((entry) => totalOf(entry.counts)), count: pickedDay ? totalOf(pickedDay.counts) : usage.total, height: 56 },
    ...USAGE_CATEGORIES.map((category) => ({
      key: category,
      label: LABELS[category],
      buckets: usage.days.map((entry) => entry.counts[category]),
      count: pickedDay ? pickedDay.counts[category] : usage.counts[category],
      height: 32,
    })),
  ]
  const GRID = 'grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 px-3 md:px-4 lg:grid-cols-[9rem_minmax(0,1fr)_6rem]'
  return (
    <>
      <div className={cn(GRID, 'h-9 items-center border-b bg-muted lg:h-8')}>
        <h2 className="label-caps">{pickedDay ? day(pickedDay.date) : 'Last 30 days'}</h2>
        <AxisLabels days={usage.days} className="max-lg:hidden" />
        <span className="label-caps text-right">{pickedDay ? 'That day' : 'Events'}</span>
      </div>
      {lines.map((line) => (
        <section key={line.key} aria-label={line.label} className={cn(GRID, 'border-b py-3')}>
          <div className="min-w-0 max-lg:order-1">
            <h3 className="font-medium">{line.label}</h3>
            <p className="mono text-xs text-muted-foreground">peak {n(Math.max(...line.buckets, 0))}/day</p>
          </div>
          <div className="max-lg:order-3 max-lg:col-span-2 max-lg:mt-2">
            <PickBars buckets={line.buckets} height={line.height} picked={picked} onPick={setPicked} />
          </div>
          <span className={cn('mono text-right font-semibold max-lg:order-2 max-lg:self-start', line.key === 'all' ? 'text-xl' : 'text-base')}>{n(line.count)}</span>
        </section>
      ))}
      <AxisLabels days={usage.days} className="px-3 pt-1 lg:hidden" />
      <Group label="Limits">
        <Row label="Events dropped" value={dropText(usage)} />
      </Group>
    </>
  )
}

// ---- C. Projects: a list of projects, noisiest first, on one time axis; what has no project sits below. ----

function Projects({ org, usage }: { org: string; usage: Usage }) {
  const GRID = 'grid items-center gap-x-4 px-3 md:px-4 grid-cols-[minmax(0,1fr)_5rem] lg:grid-cols-[12rem_minmax(0,1fr)_5rem_7rem_4rem_1rem]'
  const projectTotal = usage.counts.errors + usage.counts.transactions
  return (
    <>
      <div className={cn(GRID, 'h-9 border-b bg-muted lg:h-8')}>
        <h2 className="label-caps">Projects</h2>
        <AxisLabels days={usage.days} className="max-lg:hidden" />
        <span className="label-caps text-right max-lg:hidden">Errors</span>
        <span className="label-caps text-right max-lg:hidden">Transactions</span>
        <span className="label-caps text-right">Share</span>
        <span className="max-lg:hidden" />
      </div>
      {!usage.projects ? (
        <RowSkeleton rows={3} />
      ) : (
        <ul>
          {usage.projects.map((project) => (
            <li key={project.id}>
              <Link to="/$org/settings/projects/$project" params={{ org, project: project.slug }} className={cn(GRID, 'min-h-14 border-b py-2 hover:bg-accent lg:min-h-12')}>
                <span className="min-w-0">
                  <span className="mono block truncate font-medium">{project.slug}</span>
                  {project.dropped > 0 && <span className="block text-sm text-level-warning">Drops {project.dropped}% of new events</span>}
                  <span className="mono block text-muted-foreground lg:hidden">
                    {plural(n(project.errors), 'error')} · {plural(n(project.transactions), 'transaction')}
                  </span>
                </span>
                <Trace buckets={project.buckets} height={24} className="max-lg:order-last max-lg:col-span-2 max-lg:mt-2" />
                <span className="mono text-right max-lg:hidden">{n(project.errors)}</span>
                <span className="mono text-right max-lg:hidden">{n(project.transactions)}</span>
                <span className="mono text-right font-semibold">{percent(project.total, projectTotal)}</span>
                <ChevronRight className="size-4 text-muted-foreground max-lg:hidden" />
              </Link>
            </li>
          ))}
          {usage.projects.length === 0 && <li className="px-3 py-10 text-center text-muted-foreground md:px-4">No projects yet.</li>}
        </ul>
      )}
      <Group label="Whole organization">
        <Row label="Errors" mono value={n(usage.counts.errors)} />
        <Row label="Transactions" mono value={n(usage.counts.transactions)} />
        <Row label="Logs" mono value={n(usage.counts.logs)} />
        <Row label="Uptime checks" mono value={n(usage.counts.uptime)} />
        <Row label="Events dropped" value={usage.dropped > 0 ? `${usage.dropped}% of new events` : 'None'} />
      </Group>
    </>
  )
}

// ---- D. Table: four figures across the top, then every day as a row, newest first. ----

function DayTable({ usage }: { usage: Usage }) {
  const days = [...usage.days].reverse()
  const peak = Math.max(...days.map((entry) => totalOf(entry.counts)), 0)
  const CELL = 'mono px-2 text-right'
  return (
    <div className="flex flex-col gap-6 px-3 py-4 md:px-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-5">
        <Stat label="All events" value={n(usage.total)} />
        {USAGE_CATEGORIES.map((category) => (
          <Stat key={category} label={LABELS[category]} value={n(usage.counts[category])} />
        ))}
      </dl>
      <Change usage={usage} />
      <Section label="By day">
        <table className="w-full">
          <thead>
            <tr className="h-9 border-b text-left">
              <th className="label-caps font-normal">Day</th>
              {USAGE_CATEGORIES.map((category) => (
                <th key={category} className="label-caps px-2 text-right font-normal max-lg:hidden">
                  {LABELS[category]}
                </th>
              ))}
              <th className="label-caps px-2 text-right font-normal">All</th>
              <th className="w-1/4 max-lg:hidden" />
            </tr>
          </thead>
          <tbody>
            {days.map((entry, index) => {
              const total = totalOf(entry.counts)
              const some = USAGE_CATEGORIES.filter((category) => entry.counts[category] > 0)
              return (
                <tr key={entry.date} className="h-11 border-b lg:h-9">
                  <td className="mono">
                    {index === 0 ? 'Today' : day(entry.date)}
                    <span className="block text-xs whitespace-normal text-muted-foreground lg:hidden">{some.map((category) => `${n(entry.counts[category])} ${LABELS[category].toLowerCase()}`).join(' · ')}</span>
                  </td>
                  {USAGE_CATEGORIES.map((category) => (
                    <td key={category} className={cn(CELL, 'max-lg:hidden', entry.counts[category] === 0 && 'text-muted-foreground')}>
                      {n(entry.counts[category])}
                    </td>
                  ))}
                  <td className={cn(CELL, 'font-semibold', total === 0 && 'font-normal text-muted-foreground')}>{n(total)}</td>
                  <td className="max-lg:hidden">
                    <ShareBar part={total} whole={peak} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Section>
      <Section label="Limits">
        <p className="flex min-h-11 items-center gap-3 border-b">
          <span className="w-36 font-medium lg:w-52">Events dropped</span>
          <span className="text-muted-foreground">{dropText(usage)}</span>
        </p>
      </Section>
    </div>
  )
}

// ---- Revised: the timeline, with project rows unfolding under errors and transactions. ----

// Bars on the shared axis. A mouse shows the day under it and a click keeps it; a finger keeps the day it touches or
// drags to, while the page still scrolls up and down.
function DayBars({
  buckets,
  height,
  picked,
  onHover,
  onPin,
}: {
  buckets: number[]
  height: number
  picked: number | undefined
  onHover: (index: number | undefined) => void
  onPin: (index: number, toggle: boolean) => void
}) {
  const peak = Math.max(...buckets, 0)
  const indexAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    return Math.min(buckets.length - 1, Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * buckets.length)))
  }
  return (
    <div
      aria-hidden
      data-day-bars
      className="flex cursor-pointer touch-pan-y items-end gap-px border-b border-grid"
      style={{ height: height + 1 }}
      onPointerDown={(event) => onPin(indexAt(event), event.pointerType === 'mouse')}
      onPointerMove={(event) => (event.pointerType === 'mouse' ? onHover(indexAt(event)) : onPin(indexAt(event), false))}
      onPointerLeave={() => onHover(undefined)}
    >
      {buckets.map((count, index) => (
        <span key={index} className={cn('flex h-full min-w-0 flex-1 items-end', picked === index && 'bg-selected')}>
          <span
            className={cn('w-full', picked === index ? 'bg-foreground' : 'bg-foreground/50', picked !== undefined && picked !== index && 'dimmed')}
            style={{ height: count <= 0 || peak <= 0 ? 0 : Math.max(2, Math.round((count / peak) * height)) }}
          />
        </span>
      ))}
    </div>
  )
}

const REVISED_GRID = 'grid gap-x-6 px-3 md:px-4 lg:grid-cols-[18rem_minmax(0,1fr)]'
// The left column of every row: a name, its count, and room for a chevron, so the counts line up.
const NAME_LINE = 'flex w-full items-baseline gap-3 text-left'
const CHEVRON_SLOT = 'flex size-4 shrink-0 self-center'
type Split = typeof UsageCategory.errors | typeof UsageCategory.transactions
const isSplit = (category: UsageCategory): category is Split => category === UsageCategory.errors || category === UsageCategory.transactions

function Revised({ org, usage }: { org: string; usage: Usage }) {
  const [pinned, setPinned] = useState<number>()
  const [hovered, setHovered] = useState<number>()
  const row = useFold()
  const picked = hovered ?? pinned
  const pickedDay = picked === undefined ? undefined : usage.days[picked]
  const pin = (index: number, toggle: boolean) => setPinned(toggle && pinned === index ? undefined : index)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPinned(undefined)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const bars = (buckets: number[], height: number) => <DayBars buckets={buckets} height={height} picked={picked} onHover={setHovered} onPin={pin} />
  const allBuckets = usage.days.map((entry) => totalOf(entry.counts))
  const drops = [
    ...(usage.dropped > 0 ? [`${usage.dropped}% in every project`] : []),
    ...(usage.projects ?? []).filter((project) => project.dropped > 0).map((project) => `${project.dropped}% more in ${project.slug}`),
  ]
  return (
    <>
      <div className={cn(REVISED_GRID, 'items-center border-b bg-muted max-lg:pb-1')}>
        <div className="flex h-9 items-center justify-between lg:h-8">
          <h2 className="label-caps">{pickedDay ? day(pickedDay.date) : 'Events'}</h2>
          {pinned !== undefined && (
            <button type="button" onClick={() => setPinned(undefined)} className="touch-hit flex h-6 cursor-pointer items-center gap-1 border bg-card px-2 text-sm font-medium hover:bg-accent">
              <X className="size-3" />
              All 30 days
            </button>
          )}
        </div>
        <AxisLabels days={usage.days} />
      </div>

      <section aria-label="All events" className={cn(REVISED_GRID, 'items-end border-b bg-card py-5')}>
        <div>
          <p className={NAME_LINE}>
            <span className="min-w-0 flex-1 font-medium">All events</span>
            <span className="mono text-2xl leading-none font-semibold lg:text-3xl">{n(pickedDay ? totalOf(pickedDay.counts) : usage.total)}</span>
            <span className={CHEVRON_SLOT} />
          </p>
          <p className="mono mt-1 text-xs text-muted-foreground">peak {n(Math.max(...allBuckets, 0))}/day</p>
        </div>
        <div className="max-lg:mt-3">{bars(allBuckets, 64)}</div>
      </section>

      {USAGE_CATEGORIES.map((category) => {
        const open = isSplit(category) && row.is(category)
        const buckets = usage.days.map((entry) => entry.counts[category])
        const count = pickedDay ? pickedDay.counts[category] : usage.counts[category]
        const name = (
          <>
            <span className="min-w-0 flex-1 font-medium">{LABELS[category]}</span>
            <span className="mono font-semibold">{n(count)}</span>
            <span className={CHEVRON_SLOT}>{isSplit(category) && <FoldChevron open={open} />}</span>
          </>
        )
        const projects = isSplit(category)
          ? (usage.projects ?? [])
              .map((project) => ({ ...project, count: pickedDay ? (project.days[pickedDay.date]?.[category] ?? 0) : project[category] }))
              .sort((a, b) => b.count - a.count)
          : []
        return (
          <section key={category} aria-label={LABELS[category]} className={cn('border-b', open && 'bg-card')}>
            <div className={cn(REVISED_GRID, 'items-end py-3')}>
              <div>
                {isSplit(category) ? (
                  <button type="button" aria-expanded={open} onClick={() => row.toggle(category)} className={cn(NAME_LINE, 'touch-hit cursor-pointer')}>
                    {name}
                  </button>
                ) : (
                  <p className={NAME_LINE}>{name}</p>
                )}
                <p className="mono mt-1 text-xs text-muted-foreground">peak {n(Math.max(...buckets, 0))}/day</p>
              </div>
              <div className="max-lg:mt-2">{bars(buckets, 32)}</div>
            </div>
            {open && (
              <ul aria-label={`${LABELS[category]} by project`}>
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link to="/$org/settings/projects/$project" params={{ org, project: project.slug }} className={cn(REVISED_GRID, 'min-h-11 items-center border-t hover:bg-accent lg:min-h-9')}>
                      <span className="flex items-center gap-3">
                        <span className="mono min-w-0 flex-1 truncate">{project.slug}</span>
                        <ShareBar part={project.count} whole={count} className="w-20 lg:hidden" />
                        <span className="mono w-14 text-right">{n(project.count)}</span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground lg:hidden" />
                        <span className="size-4 shrink-0 max-lg:hidden" />
                      </span>
                      <span className="flex items-center gap-3 max-lg:hidden">
                        <ShareBar part={project.count} whole={count} className="flex-1" />
                        <span className="mono w-10 text-right text-muted-foreground">{percent(project.count, count)}</span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      <div className={cn(REVISED_GRID, 'min-h-12 items-center border-b py-2 lg:min-h-11')}>
        <span className="font-medium">Events dropped</span>
        {drops.length ? (
          <span className="flex items-center gap-2 max-lg:mt-1">
            <Gauge className="size-4 shrink-0 text-level-warning" aria-hidden />
            <span>
              Dropping {drops.join(', ')}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">None</span>
        )}
      </div>
      {usage.licenseEmail && (
        <div className={cn(REVISED_GRID, 'min-h-12 items-center border-b py-2 lg:min-h-11')}>
          <span className="font-medium">Billing email</span>
          <span className="mono [overflow-wrap:anywhere] text-muted-foreground">{usage.licenseEmail}</span>
        </div>
      )}
    </>
  )
}

// ---- The prototype's own bar: not part of any design. ----

function PrototypeSwitcher({ org, current }: { org: string; current: UsageVariant }) {
  const navigate = useNavigate()
  const index = VARIANTS.indexOf(current)
  const go = (step: number) =>
    void navigate({ to: '/$org/settings/subscription', params: { org }, search: { variant: VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length]! }, replace: true })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable]')) return
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const arrow = 'grid size-9 cursor-pointer place-items-center hover:bg-white/20'
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black p-1 text-sm whitespace-nowrap text-white shadow-lg max-lg:bottom-16" data-prototype-switcher>
      <button type="button" aria-label="Previous variant" className={cn(arrow, 'rounded-full')} onClick={() => go(-1)}>
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-2">
        <span className="font-mono font-semibold">{current}</span>
        <span className="max-lg:hidden"> ({VARIANT_NAMES[current]})</span>
      </span>
      <button type="button" aria-label="Next variant" className={cn(arrow, 'rounded-full')} onClick={() => go(1)}>
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
