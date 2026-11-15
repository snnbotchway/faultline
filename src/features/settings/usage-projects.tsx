import { useQueries } from '@tanstack/react-query'
import { useState } from 'react'
import { IssueLevel } from '@/api/issues'
import type { Project } from '@/api/projects'
import { projectUsageQuery, type ProjectKind, type UsageDay } from '@/api/usage'
import { RowButton } from '@/components/ui/row-button'
import { Skeleton } from '@/components/ui/skeleton'
import { LevelGlyph } from '@/features/issues/level'
import { plural } from '@/lib/text'
import { cn } from '@/lib/utils'
import { DayBars } from './day-bars'
import { FIGURES, GRID, PROJECT_ROW, ProjectRow, SLOT, Share } from './usage-rows'
import { KIND_LABEL, KIND_WORD, effectiveDropRate, exactCount } from './usage'

// Each project is its own request, so a large organization asks about this many until the rest are wanted.
const FIRST_PROJECTS = 20
const BAR_HEIGHT = 16

/**
 * The projects behind one kind, busiest first as their counts arrive, each drawn on the kind's own scale so their
 * bars compare. Busiest is on the pinned day, or over the whole period: a day under the pointer changes the figures
 * but never the order. Shares are of the kind's total, and what no listed project accounts for (one not shown yet, or
 * a deleted one) is one line once every listed project has answered. Projects that never sent an event are one line
 * at the end, and are not asked about.
 */
export function ProjectRows({
  org,
  kind,
  projects,
  organizationRate,
  days,
  picked,
  pinned,
  now,
  peak,
  total,
}: {
  org: string
  kind: ProjectKind
  projects: Project[]
  organizationRate: number
  days: UsageDay[]
  picked: number | undefined
  pinned: number | undefined
  now: number
  peak: number
  total: number
}) {
  const [everyProject, setEveryProject] = useState(false)
  const active = projects.filter((project) => project.firstEvent)
  const quiet = projects.length - active.length
  const shown = everyProject ? active : active.slice(0, FIRST_PROJECTS)
  const results = useQueries({ queries: shown.map((project) => projectUsageQuery(org, kind, project.id, now)) })
  const countOn = (byDay: Record<string, number>, index: number | undefined) => {
    const date = index === undefined ? undefined : days[index]?.date
    return date ? (byDay[date] ?? 0) : Object.values(byDay).reduce((sum, value) => sum + value, 0)
  }

  const rows = shown
    .map((project, index) => {
      const result = results[index]!
      const byDay = result.data
      if (!byDay) return { project, result }
      return { project, result, count: countOn(byDay, picked), order: countOn(byDay, pinned), buckets: days.map((day) => byDay[day.date] ?? 0) }
    })
    .toSorted((a, b) => (b.order ?? -1) - (a.order ?? -1))
  const counted = rows.reduce((sum, row) => sum + (row.count ?? 0), 0)
  const rest = rows.every((row) => row.count !== undefined) ? total - counted : 0

  return (
    <ul aria-label={`${KIND_LABEL[kind]} by project`}>
      {rows.map(({ project, result, count, buckets }) => {
        const slug = <span className="mono block [overflow-wrap:anywhere]">{project.slug}</span>
        if (count === undefined && result.isError)
          return (
            <li key={project.id} className={cn(GRID, PROJECT_ROW)}>
              <span className={FIGURES}>
                <span className="min-w-0 flex-1">{slug}</span>
                <span className="text-sm text-muted-foreground">Didn't load</span>
                <RowButton onClick={() => void result.refetch()}>Try again</RowButton>
              </span>
            </li>
          )
        if (count === undefined)
          return (
            <ProjectRow
              key={project.id}
              org={org}
              project={project}
              figures={
                <>
                  <span className="min-w-0 flex-1">{slug}</span>
                  <Skeleton className="h-3 w-16 self-center" />
                </>
              }
              aside={<Skeleton className="h-4 max-lg:mt-2" />}
            />
          )
        const dropped = effectiveDropRate(organizationRate, project.eventThrottleRate ?? 0)
        return (
          <ProjectRow
            key={project.id}
            org={org}
            project={project}
            figures={
              <>
                <span className="min-w-0 flex-1">
                  {slug}
                  {dropped > 0 && (
                    <span className="flex items-baseline gap-1 text-sm">
                      <LevelGlyph level={IssueLevel.warning} className="self-center" />
                      <span className="mono">{dropped}%</span> to drop
                    </span>
                  )}
                </span>
                <span className="mono">{exactCount(count)}</span>
                <Share part={count} whole={total} of={KIND_WORD[kind][1]} />
              </>
            }
            aside={<DayBars label={`${project.slug} a day`} buckets={buckets} height={BAR_HEIGHT} peak={peak} picked={picked} className="max-lg:mt-2" />}
          />
        )
      })}
      {rest > 0 && (
        <li className={cn(GRID, PROJECT_ROW, 'text-muted-foreground')}>
          <span className={FIGURES}>
            <span className="min-w-0 flex-1">Other projects</span>
            <span className="mono">{exactCount(rest)}</span>
            <Share part={rest} whole={total} of={KIND_WORD[kind][1]} />
            <span className={SLOT} />
          </span>
        </li>
      )}
      {shown.length < active.length && (
        <li className="border-t">
          <button type="button" className="flex min-h-11 w-full cursor-pointer items-center px-3 text-left text-sm font-medium hover:bg-accent md:px-4 lg:min-h-9" onClick={() => setEveryProject(true)}>
            Show all {active.length} projects
          </button>
        </li>
      )}
      {quiet > 0 && (
        <li className={cn(GRID, PROJECT_ROW, 'text-muted-foreground')}>
          <span>{plural(quiet, 'project')} with no events yet</span>
        </li>
      )}
    </ul>
  )
}
