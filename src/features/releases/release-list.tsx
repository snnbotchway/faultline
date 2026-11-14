import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { newIssuesByReleaseQuery, releaseListQuery, type NewIssueCounts, type Release } from '@/api/releases'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { clock, compact, dayName, exact } from '@/features/issues/format'
import { countWord, releaseName } from '@/lib/text'
import { useTitle } from '@/lib/title'
import { EventsChart } from './events-chart'

// How many unresolved issues a release brought, when the one page of newest issues covers it.
// Every row's time column is as wide as the longest time of day, so the release names line up
// in locales whose clock grows, such as "10:15 a.m." beside "9:05 a.m.".
const WIDEST_CLOCKS = [new Date(2000, 0, 1, 10, 58), new Date(2000, 0, 1, 22, 58)].map(clock)

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
      const day = dayName(new Date(release.dateCreated), new Date(now))
      groups.set(day, [...(groups.get(day) ?? []), release])
    }
    return [...groups]
  }, [releases, now])
  const hits = list.data?.pages[0]?.hits

  const bar = (
    <PageBar>
      <h1 className="text-2xl font-semibold">Releases</h1>
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
        <EventsChart org={org} releases={releases} className="border-b px-3 pt-4 pb-3 lg:px-4" />
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
                        className="grid grid-cols-[minmax(64px,max-content)_minmax(0,1fr)] gap-x-3 px-3 py-3 transition-colors duration-100 hover:bg-accent/60 lg:grid-cols-[minmax(72px,max-content)_minmax(0,1fr)] lg:px-4"
                      >
                        {/* The day heading says how long ago; the row gives the time of that day (DESIGN.md, Copy). */}
                        <span className="mono grid whitespace-nowrap text-muted-foreground *:[grid-area:1/1]">
                          <time dateTime={release.dateCreated} title={exact(release.dateCreated)}>
                            {clock(release.dateCreated)}
                          </time>
                          {WIDEST_CLOCKS.map((time) => (
                            <span key={time} aria-hidden className="invisible">
                              {time}
                            </span>
                          ))}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-baseline gap-3">
                            <span className="mono min-w-0 truncate font-semibold" title={release.version}>
                              {releaseName(release.version)}
                            </span>
                            {fresh !== undefined && fresh > 0 && (
                              <span className="shrink-0 text-trend-new">
                                <span className="mono font-semibold">{fresh}</span> new {countWord(fresh, 'issue')}
                              </span>
                            )}
                          </span>
                          {/* Slugs are machine text; the counts are words, with their figure in mono. */}
                          {(release.projects.length > 0 || release.deployCount > 0 || release.commitCount > 0) && (
                            <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                              {release.projects.length > 0 && <span className="mono">{release.projects.map((project) => project.slug).join(', ')}</span>}
                              {/* A release without deploys may still be live: GlitchTip only knows of deploys a pipeline reports. */}
                              {release.deployCount > 0 && (
                                <span>
                                  <Counted count={release.deployCount} word="deploy" />
                                </span>
                              )}
                              {release.commitCount > 0 && (
                                <span>
                                  <Counted count={release.commitCount} word="commit" />
                                </span>
                              )}
                            </span>
                          )}
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
            <Button onClick={() => void list.fetchNextPage()} aria-busy={list.isFetchingNextPage}>
              More releases
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

// `2 deploys`: the figure in mono, the word in the sans.
function Counted({ count, word }: { count: number; word: string }) {
  return (
    <>
      <span className="mono">{count}</span> {countWord(count, word)}
    </>
  )
}
