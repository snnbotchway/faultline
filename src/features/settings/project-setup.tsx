import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleCheck, CircleDashed } from 'lucide-react'
import { useEffect, useState } from 'react'
import { latestIssueQuery, projectActions, projectQuery, type ProjectDetail } from '@/api/projects'
import { stale } from '@/api/stale'
import { Button } from '@/components/ui/button'
import { ago } from '@/features/issues/format'
import { LevelGlyph } from '@/features/issues/level'
import { useChange } from './change'
import { PlatformPicker, Snippets } from './fields'
import { FormDialog } from './parts'
import { OTHER_PLATFORM, platformName, shownPlatform, storedPlatform } from './platforms'
import { ProjectTab } from './project-tabs'

const POLL_MS = 5000
// How many times the set-up step asks for the first issue after the first event: a minute's worth.
const ISSUE_TRIES = 12

/**
 * The set-up step: what to paste, and whether it worked. The page asks the backend for the project's first event
 * every few seconds while it is open, and shows the issue the moment one arrives.
 */
export function ProjectSetup({ org, project, dsn, keysLoaded, write }: { org: string; project: ProjectDetail; dsn?: string; keysLoaded: boolean; write: boolean }) {
  const slug = project.slug ?? ''
  const [changing, setChanging] = useState(false)
  // Someone who cannot change the project can still look at another platform's code.
  const [viewed, setViewed] = useState<string>()
  const platform = viewed ?? shownPlatform(project.platform)
  const firstEvent = useQuery({ ...projectQuery(org, slug), refetchInterval: (query) => (query.state.data?.firstEvent ? false : POLL_MS) }).data?.firstEvent
  const save = useChange('change the platform', (id: string) => projectActions.update(org, slug, { name: project.name, platform: storedPlatform(id) }), {
    stale: [stale.projects(org)],
    notice: true,
  })
  const choose = (id: string) => {
    setChanging(false)
    setViewed(id)
    if (write && id !== shownPlatform(project.platform)) save.run(id)
  }
  return (
    <div className="flex min-w-0 flex-col gap-4 p-3 md:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-xl font-semibold">
          {platform === OTHER_PLATFORM ? 'Send events to ' : `Add ${platformName(platform)} to `}
          <span className="font-mono text-lg">{slug}</span>
        </h2>
        <button type="button" onClick={() => setChanging(true)} className="text-sm font-medium whitespace-nowrap text-brand underline-offset-4 hover:underline max-lg:h-11">
          Change platform
        </button>
      </div>
      {firstEvent ? <Arrived org={org} slug={slug} projectId={project.id} firstEvent={firstEvent} /> : <Waiting />}
      {dsn ? (
        <Snippets platform={platform} dsn={dsn} />
      ) : (
        keysLoaded && (
          <p className="prose-text">
            This project has no client key, so there is no DSN to send events to.{' '}
            <Link to="/$org/settings/projects/$project" params={{ org, project: slug }} search={{ tab: ProjectTab.keys }} className="font-medium text-brand underline-offset-4 hover:underline">
              Create a key
            </Link>
          </p>
        )
      )}
      <FormDialog open={changing} onClose={() => setChanging(false)} title="Change platform">
        <PlatformPicker value={platform} onChange={choose} />
      </FormDialog>
    </div>
  )
}

function Waiting() {
  return (
    <div role="status" className="flex min-h-11 items-center gap-2 border border-dashed px-3">
      <CircleDashed className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="font-medium">Waiting for the first event</span>
    </div>
  )
}

function Arrived({ org, slug, projectId, firstEvent }: { org: string; slug: string; projectId: string; firstEvent: string }) {
  // The backend marks the first event before it files the issue, and a transaction marks it with no issue at all,
  // so this asks again for a while, then stops.
  const queryClient = useQueryClient()
  const options = latestIssueQuery(org, projectId)
  const issue = useQuery({ ...options, refetchInterval: (query) => (query.state.data || query.state.dataUpdateCount >= ISSUE_TRIES ? false : POLL_MS) }).data
  const gaveUp = issue === null && (queryClient.getQueryState(options.queryKey)?.dataUpdateCount ?? 0) >= ISSUE_TRIES
  // Whether the issue was missing while this was open, so it arrived just now rather than long ago.
  const [waited, setWaited] = useState(false)
  if (issue === null && !waited) setWaited(true)
  const issueId = issue?.id
  // The backend files an event's environment before its issue, so once the issue is in, the environment is too.
  useEffect(() => {
    if (!issueId || !waited) return
    void queryClient.invalidateQueries(stale.project(org, slug))
    void queryClient.invalidateQueries(stale.environments(org))
  }, [issueId, waited, queryClient, org, slug])
  return (
    <div role="status" className="border border-ok/60">
      <div className="flex min-h-11 items-center gap-2 px-3">
        <CircleCheck className="size-4 shrink-0 text-ok" aria-hidden />
        <span className="font-medium">{gaveUp ? 'Event received. No issue yet.' : 'First event received'}</span>
        <span className="mono ml-auto text-muted-foreground">{ago(firstEvent)} ago</span>
      </div>
      {issue && (
        <div className="flex flex-col gap-3 border-t border-ok/60 p-3 lg:flex-row lg:items-center">
          <span className="flex min-w-0 flex-1 items-start gap-2">
            <LevelGlyph level={issue.level} className="mt-1 shrink-0" />
            <span className="min-w-0 break-words">{issue.title}</span>
          </span>
          <Button asChild variant="default">
            <Link to="/$org/issues/$issueId" params={{ org, issueId: issue.id }}>
              Open issue
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
