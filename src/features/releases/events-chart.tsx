import { useQuery } from '@tanstack/react-query'
import { dailyEventsQuery } from '@/api/releases'
import { Skeleton } from '@/components/ui/skeleton'
import { compact, dayLabel } from '@/features/issues/format'
import { ReleaseTrace } from '@/features/issues/trace'
import { releaseMarks, spanAxis } from '@/features/issues/trend'
import { DAY_MS } from '@/lib/time'

export const EVENT_DAYS = 14

/**
 * Error events per day over the last two weeks, with each of `releases` marked where it was made and the chart
 * labelled with its peak. `projects` (ids) narrows it to those projects.
 */
export function EventsChart({
  org,
  releases,
  projects,
  className,
}: {
  org: string
  releases: { shortVersion: string; dateCreated: string }[]
  projects?: number[]
  className?: string
}) {
  const events = useQuery({ ...dailyEventsQuery(org, EVENT_DAYS, projects), enabled: !projects || projects.length > 0 })
  if (!events.data)
    return (
      <div className={className}>
        {events.isError ? <p className="flex h-25 items-center text-muted-foreground">The events per day didn't load.</p> : <Skeleton className="h-25" />}
      </div>
    )
  const { start, counts } = events.data
  const marks = releaseMarks(releases, spanAxis(start, start + EVENT_DAYS * DAY_MS))
  const peak = Math.max(0, ...counts)
  return (
    <div className={className}>
      <ReleaseTrace buckets={counts} marks={marks} height={56} />
      <p className="label-caps mt-2 flex justify-between gap-3">
        <span>{dayLabel(start / 1000)}</span>
        <span>
          Errors · peak <span className="mono text-foreground">{compact(peak)}</span>/day
        </span>
        <span>Today</span>
      </p>
    </div>
  )
}
