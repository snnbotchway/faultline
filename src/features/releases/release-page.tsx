import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { Issue } from '@/api/issues'
import { canManageReleases, organizationQuery, projectsQuery } from '@/api/organizations'
import { canOpenRelease, isNewIn, releaseActions, releaseCommitsQuery, releaseDeploysQuery, releaseFilesQuery, releaseIssuesQuery, releaseKeys, releaseQuery, type Release, type ReleaseFile } from '@/api/releases'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { CRUMB_LINK, Crumbs } from '@/components/shell/crumbs'
import { Button } from '@/components/ui/button'
import { RowButton } from '@/components/ui/row-button'
import { Section } from '@/components/ui/section'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/task-dialog'
import { explain, isNotFound } from '@/api/errors'
import { errorParts } from '@/features/issues/event'
import { bytes, ago, brief, compact, exact } from '@/features/issues/format'
import { LevelGlyph } from '@/features/issues/level'
import { countWord, releaseName } from '@/lib/text'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { EventsChart } from './events-chart'

const COMMITS_SHOWN = 3
const SHA_SHOWN = 7

/** One release: the issues it brought and the ones still happening in it, where it was deployed, its commits and its files. */
export function ReleasePage({ org, version }: { org: string; version: string }) {
  const openable = canOpenRelease(version)
  const release = useQuery({ ...releaseQuery(org, version), enabled: openable })
  useTitle(releaseName(version), 'Releases')

  const bar = (
    <PageBar>
      <Crumbs
        root={
          <Link to="/$org/releases" params={{ org }} className={CRUMB_LINK}>
            Releases
          </Link>
        }
      >
        <span className="font-mono" title={version}>
          {releaseName(version)}
        </span>
      </Crumbs>
    </PageBar>
  )
  if (!openable)
    return (
      <>
        {bar}
        <Screen title="Releases with a slash in the version can't be opened">
          <Button asChild>
            <Link to="/$org/releases" params={{ org }}>
              Go to releases
            </Link>
          </Button>
        </Screen>
      </>
    )
  if (release.isError) {
    const missing = isNotFound(release.error)
    return (
      <>
        {bar}
        <Screen title={missing ? 'Release not found' : "This release didn't load"}>
          {missing ? (
            <Button asChild>
              <Link to="/$org/releases" params={{ org }}>
                Go to releases
              </Link>
            </Button>
          ) : (
            <Button onClick={() => void release.refetch()}>Try again</Button>
          )}
        </Screen>
      </>
    )
  }

  return (
    <>
      {bar}
      <div className="mx-auto grid w-full max-w-6xl gap-x-10 px-3 pb-16 md:px-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <header className="py-5">
            <h1 className="font-mono text-xl font-semibold break-all lg:text-2xl" title={version}>
              {releaseName(version)}
            </h1>
            {release.data ? (
              <p className="mono mt-2 text-muted-foreground">
                {release.data.projects.map((project) => project.slug).join(', ')} · <time dateTime={release.data.dateCreated}>{brief(release.data.dateCreated)}</time>
              </p>
            ) : (
              <Skeleton className="mt-2 h-4 w-48" />
            )}
          </header>
          {release.data && <ReleaseEvents org={org} release={release.data} />}
          <ReleaseIssues org={org} version={version} />
        </div>
        <aside className="flex flex-col gap-8 pt-5 lg:border-l lg:pl-6">
          <Deploys org={org} version={version} />
          <Commits org={org} version={version} />
          <Files org={org} version={version} />
        </aside>
      </div>
    </>
  )
}

// The errors of the release's projects over the last two weeks, with this release marked where it was made.
function ReleaseEvents({ org, release }: { org: string; release: Release }) {
  const projects = useQuery(projectsQuery(org)).data
  const ids = projects?.filter((project) => release.projects.some((other) => other.slug === project.slug)).map((project) => Number(project.id))
  if (!ids) return <Skeleton className="mb-8 h-25" />
  return (
    <Section label="Errors in its projects" className="mb-8">
      <EventsChart org={org} releases={[release]} projects={ids} className="pt-3" />
    </Section>
  )
}

function ReleaseIssues({ org, version }: { org: string; version: string }) {
  const issues = useInfiniteQuery(releaseIssuesQuery(org, version))
  if (issues.isPending) return <Skeleton className="h-40" />
  if (issues.isError) return <p className="border-t py-4 text-muted-foreground">The issues in this release didn't load.</p>
  const items = issues.data.pages.flatMap((page) => page.items)
  if (!items.length) return <p className="border-t py-4 text-muted-foreground">No open issues have events in this release.</p>
  const fresh = items.filter((issue) => isNewIn(issue, version))
  const known = items.filter((issue) => !isNewIn(issue, version))
  // Counts are of the issues loaded so far; more pages may add to either list.
  const more = issues.hasNextPage ? '+' : ''
  return (
    <>
      {fresh.length > 0 && <IssueList org={org} label="First seen in this release" count={`${fresh.length}${more}`} issues={fresh} fresh />}
      {known.length > 0 && <IssueList org={org} label="Seen before, still happening" count={`${known.length}${more}`} issues={known} className={fresh.length ? 'mt-6' : undefined} />}
      {issues.hasNextPage && (
        <Button className="mt-3" aria-busy={issues.isFetchingNextPage} disabled={issues.isFetchingNextPage} onClick={() => void issues.fetchNextPage()}>
          More issues
        </Button>
      )}
    </>
  )
}

const ISSUE_COLUMNS = 'grid-cols-[minmax(0,1fr)_56px_80px] lg:grid-cols-[minmax(0,1fr)_64px_88px]'

function IssueList({ org, label, count, issues, fresh = false, className }: { org: string; label: string; count: string; issues: Issue[]; fresh?: boolean; className?: string }) {
  return (
    <section aria-label={label} className={className}>
      <h2 className={cn('label-caps flex h-9 items-center gap-2 border-b', fresh && 'font-semibold text-trend-new')}>
        {label}
        <span className="font-normal text-muted-foreground">{count}</span>
      </h2>
      <div aria-hidden className={cn('grid h-8 items-center gap-x-4 border-b whitespace-nowrap', ISSUE_COLUMNS)}>
        <span />
        <span className="label-caps text-right">Events</span>
        <span className="label-caps text-right">Last seen</span>
      </div>
      <ul>
        {issues.map((issue) => {
          const { type, text } = errorParts(issue)
          return (
            <li key={issue.id} className="border-b">
              <Link to="/$org/issues/$issueId" params={{ org, issueId: issue.id }} className={cn('grid items-center gap-x-4 py-2 transition-colors duration-100 hover:bg-accent/60', ISSUE_COLUMNS)}>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <LevelGlyph level={issue.level} />
                    <span className={cn('truncate max-lg:line-clamp-2 max-lg:whitespace-normal', !type && 'font-medium')}>
                      {type && <span className="error-type">{type} </span>}
                      {text}
                    </span>
                  </span>
                  <span className="mono block pl-5 text-muted-foreground">{issue.shortId}</span>
                </span>
                <span className="mono text-right">{compact(issue.count)}</span>
                <time className="mono text-right text-muted-foreground" dateTime={issue.lastSeen} title={exact(issue.lastSeen)}>
                  {ago(issue.lastSeen)}
                </time>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Deploys({ org, version }: { org: string; version: string }) {
  const deploys = useQuery(releaseDeploysQuery(org, version))
  return (
    <Section label="Deploys" count={deploys.data?.length}>
      {deploys.isPending ? (
        <Skeleton className="mt-3 h-12" />
      ) : deploys.isError ? (
        <p className="py-3 text-muted-foreground">The deploys didn't load.</p>
      ) : deploys.data.length === 0 ? (
        <p className="py-3 text-muted-foreground">Not deployed anywhere yet.</p>
      ) : (
        <ul>
          {deploys.data.map((deploy) => (
            <li key={deploy.id} className="border-b py-2">
              <span className="flex justify-between gap-3">
                <span className="mono font-semibold">{deploy.environment}</span>
                <time className="mono text-muted-foreground" dateTime={deploy.dateFinished ?? deploy.dateCreated}>
                  {brief(deploy.dateFinished ?? deploy.dateCreated)}
                </time>
              </span>
              {deploy.url && <span className="mono block truncate text-muted-foreground">{deploy.url}</span>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Commits({ org, version }: { org: string; version: string }) {
  const commits = useQuery(releaseCommitsQuery(org, version))
  const [all, setAll] = useState(false)
  return (
    <Section label="Commits" count={commits.data?.length}>
      {commits.isPending ? (
        <Skeleton className="mt-3 h-12" />
      ) : commits.isError ? (
        <p className="py-3 text-muted-foreground">The commits didn't load.</p>
      ) : commits.data.length === 0 ? (
        <p className="py-3 text-muted-foreground">No commits were sent with this release.</p>
      ) : (
        <>
          <ul>
            {commits.data.slice(0, all ? undefined : COMMITS_SHOWN).map((commit) => (
              <li key={commit.id} className="border-b py-2">
                <span className="block [overflow-wrap:anywhere]">{commit.message?.split('\n')[0]}</span>
                <span className="mono block text-muted-foreground">
                  <span title={commit.id}>{commit.id.slice(0, SHA_SHOWN)}</span>
                  {commit.authorName && ` · ${commit.authorName}`}
                </span>
              </li>
            ))}
          </ul>
          {!all && commits.data.length > COMMITS_SHOWN && (
            <Button className="mt-3" onClick={() => setAll(true)}>
              All {commits.data.length} commits
            </Button>
          )}
        </>
      )}
    </Section>
  )
}

function Files({ org, version }: { org: string; version: string }) {
  const files = useInfiniteQuery(releaseFilesQuery(org, version))
  const canManage = canManageReleases(useQuery(organizationQuery(org)).data?.access)
  const [shown, setShown] = useState(false)
  const items = files.data?.pages.flatMap((page) => page.items) ?? []
  const count = files.hasNextPage ? `${items.length}+` : items.length
  return (
    <Section
      label="Files"
      count={files.data ? items.length : undefined}
      action={
        items.length > 0 && (
          <Button variant="ghost" aria-expanded={shown} onClick={() => setShown((current) => !current)}>
            {shown ? 'Hide' : 'Show'}
          </Button>
        )
      }
    >
      {files.isPending ? (
        <Skeleton className="mt-3 h-8" />
      ) : files.isError ? (
        <p className="py-3 text-muted-foreground">The files didn't load.</p>
      ) : items.length === 0 ? (
        <p className="py-3 text-muted-foreground">No source maps uploaded.</p>
      ) : !shown ? (
        <p className="mono py-3 text-muted-foreground">
          {count} {countWord(items.length, 'file')}, {bytes(items.reduce((sum, file) => sum + file.size, 0))}
        </p>
      ) : (
        <>
          <ul>
            {items.map((file) => (
              <FileRow key={file.id} org={org} version={version} file={file} canDelete={canManage} />
            ))}
          </ul>
          {files.hasNextPage && (
            <Button className="mt-3" aria-busy={files.isFetchingNextPage} onClick={() => void files.fetchNextPage()}>
              More files
            </Button>
          )}
        </>
      )}
    </Section>
  )
}

function FileRow({ org, version, file, canDelete }: { org: string; version: string; file: ReleaseFile; canDelete: boolean }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string>()
  const remove = useMutation({
    mutationFn: () => releaseActions.removeFile(org, version, file.id),
    onSuccess: () => {
      setConfirming(false)
      void queryClient.invalidateQueries({ queryKey: releaseKeys.files(org, version) })
    },
    onError: (failure) => setError(explain(failure, 'delete the file')),
  })
  const name = file.name.replace(/^~\//, '')
  return (
    <li className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b max-lg:min-h-11">
      <span className="mono truncate" title={file.name}>
        {name}
      </span>
      <span className="mono text-muted-foreground">{bytes(file.size)}</span>
      {canDelete && (
        <RowButton danger onClick={() => setConfirming(true)}>
          Delete
        </RowButton>
      )}
      <ConfirmDialog
        open={confirming}
        title={`Delete ${name}?`}
        description="New errors in this release that need this file won't be matched to your source. This can't be undone."
        action="Delete file"
        busy={remove.isPending}
        error={error}
        onConfirm={() => {
          setError(undefined)
          remove.mutate()
        }}
        onClose={() => setConfirming(false)}
      />
    </li>
  )
}
