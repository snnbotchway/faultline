import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { StatsPeriod } from '@/api/issues'
import { dailyEventsQuery, newIssuesByReleaseQuery, releaseListQuery, type NewIssueCounts, type Release } from '@/api/releases'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { compact, dayLabel, plural } from '@/features/issues/format'
import { Trace } from '@/features/issues/trace'
import { axisFor, fillBuckets } from '@/features/issues/trend'
import { ReleaseLabels } from '@/features/uptime/parts'
import { clockTime, dayName } from '@/features/uptime/format'
import { useTitle } from '@/lib/title'
import { releaseMarksOn } from './marks'

const DAYS = 14

// How many unresolved issues a release brought, when the one page of newest issues covers it.
function newIssues(counts: NewIssueCounts | undefined, release: Release): number | undefined {
  if (!counts) return undefined
  const known = counts.complete || (counts.since !== undefined && Date.parse(release.dateCreated) >= Date.parse(counts.since))
  return known ? (counts.counts.get(release.version) ?? 0) : undefined
}

/** Releases newest first, grouped by day, under the organization's events per day with each release marked on it. */
export function ReleaseList({ org }: { org: string }) {
  useTitle('Releases')
  const list = useInfiniteQuery(releaseListQuery(org))
  const counts = useQuery(newIssuesByReleaseQuery(org)).data
  const releases = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data])
  const now = list.dataUpdatedAt
  const days = useMemo(() => {
    const groups = new Map<string, Release[]>()
    for (const release of releases) {
      const day = dayName(Date.parse(release.dateCreated), now)
      groups.set(day, [...(groups.get(day) ?? []), release])
    }
    return [...groups]
  }, [releases, now])
  const hits = list.data?.pages[0]?.hits

  const bar = (
    <PageBar>
      <h1 className="text-sm font-medium">Releases</h1>
      {hits !== undefined && <span className="mono text-muted-foreground">{compact(hits)}</span>}
    </PageBar>
  )
  if (list.isError)
    return (
      <>
        {bar}
        <Screen title="The releases didn't load">
          <Button onClick={() => void list.refetch()}>Try again</Button>
        </Screen>
      </>
    )
  if (list.isSuccess && releases.length === 0)
    return (
      <>
        {bar}
        <Screen title="Releases show here once an app reports one with its errors" />
      </>
    )

  return (
    <>
      {bar}
      <div className="mx-auto w-full max-w-4xl pb-16">
        <EventsChart org={org} releases={releases} />
        {list.isPending ? (
          <div aria-busy aria-label="Loading releases">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2 border-b px-3 py-3 lg:px-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </div>
        ) : (
          days.map(([day, items]) => (
            <section key={day} aria-label={day}>
              <h2 className="label-caps sticky top-11 z-10 flex h-9 items-center border-b bg-background px-3 lg:px-4">{day}</h2>
              <ul>
                {items.map((release) => {
                  const fresh = newIssues(counts, release)
                  return (
                    <li key={release.version} className="border-b">
                      <Link
                        to="/$org/releases/$"
                        params={{ org, _splat: release.version }}
                        className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 px-3 py-3 transition-colors duration-100 hover:bg-accent/60 lg:grid-cols-[56px_minmax(0,1fr)] lg:px-4"
                      >
                        <time className="mono text-muted-foreground" dateTime={release.dateCreated}>
                          {clockTime(release.dateCreated)}
                        </time>
                        <span className="min-w-0">
                          <span className="flex items-baseline gap-3">
                            <span className="mono min-w-0 truncate font-semibold" title={release.version}>
                              {release.version}
                            </span>
                            {fresh !== undefined && fresh > 0 && (
                              <span className="shrink-0 text-trend-new">
                                <span className="mono font-semibold">{fresh}</span> new {fresh === 1 ? 'issue' : 'issues'}
                              </span>
                            )}
                          </span>
                          <span className="mono mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                            <span>{release.projects.map((project) => project.slug).join(', ')}</span>
                            <span>{release.deployCount ? plural(release.deployCount, 'deploy') : 'not deployed'}</span>
                            {release.commitCount > 0 && <span>{plural(release.commitCount, 'commit')}</span>}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
        {list.hasNextPage && (
          <div className="px-3 py-4 lg:px-4">
            <Button onClick={() => void list.fetchNextPage()} aria-busy={list.isFetchingNextPage} className="max-lg:h-11">
              More releases
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

function EventsChart({ org, releases }: { org: string; releases: Release[] }) {
  const events = useQuery(dailyEventsQuery(org, DAYS))
  const [opened] = useState(Date.now)
  const axis = useMemo(() => axisFor(StatsPeriod.fortnight, new Date(events.dataUpdatedAt || opened)), [events.dataUpdatedAt, opened])
  const buckets = fillBuckets(events.data, axis)
  const from = axis.start * 1000
  const marks = releaseMarksOn(releases, from, from + axis.size * axis.count * 1000)
  return (
    <div className="border-b px-3 pt-4 pb-3 lg:px-4">
      <ReleaseLabels marks={marks} />
      {events.isPending ? <Skeleton className="h-14" /> : <Trace buckets={buckets} marks={marks} height={56} />}
      <p className="label-caps mt-2 flex justify-between">
        <span>{dayLabel(axis.start)}</span>
        <span>Events / day</span>
        <span>Today</span>
      </p>
    </div>
  )
}
