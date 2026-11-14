import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleCheck, CircleDashed } from 'lucide-react'
import { useState } from 'react'
import { latestIssueQuery, projectActions, projectQuery, type ProjectDetail } from '@/api/projects'
import { Button } from '@/components/ui/button'
import { ago } from '@/features/issues/format'
import { LevelGlyph } from '@/features/issues/level'
import { useChange } from './access'
import { PlatformPicker, Snippets } from './fields'
import { FormDialog } from './parts'
import { OTHER_PLATFORM, platformName } from './platforms'
import { ProjectTab } from './project-tabs'

const POLL_MS = 5000

/**
 * The set-up step: what to paste, and whether it worked. The page asks the backend for the project's first event
 * every few seconds while it is open, and shows the issue the moment one arrives.
 */
export function ProjectSetup({ org, project, dsn, keysLoaded, write }: { org: string; project: ProjectDetail; dsn?: string; keysLoaded: boolean; write: boolean }) {
  const slug = project.slug ?? ''
  const [changing, setChanging] = useState(false)
  // Someone who cannot change the project can still look at another platform's code.
  const [viewed, setViewed] = useState<string>()
  const platform = viewed ?? project.platform ?? OTHER_PLATFORM
  const firstEvent = useQuery({ ...projectQuery(org, slug), refetchInterval: (query) => (query.state.data?.firstEvent ? false : POLL_MS) }).data?.firstEvent
  const save = useChange(org, 'change the platform', (id: string) => projectActions.update(org, slug, { name: project.name, platform: id === OTHER_PLATFORM ? null : id }), { notice: true })
  const choose = (id: string) => {
    setChanging(false)
    setViewed(id)
    if (write && id !== (project.platform ?? OTHER_PLATFORM)) save.run(id)
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
      {firstEvent ? <Arrived org={org} projectId={project.id} firstEvent={firstEvent} /> : <Waiting />}
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
    <div role="status" className="flex min-h-11 items-center gap-2.5 border border-dashed px-3">
      <CircleDashed className="size-4 shrink-0 animate-spin text-muted-foreground [animation-duration:4s] motion-reduce:animate-none" aria-hidden />
      <span className="font-medium">Waiting for the first event</span>
    </div>
  )
}

function Arrived({ org, projectId, firstEvent }: { org: string; projectId: string; firstEvent: string }) {
  const issue = useQuery(latestIssueQuery(org, projectId)).data
  return (
    <div role="status" className="border border-ok/60">
      <div className="flex min-h-11 items-center gap-2.5 px-3">
        <CircleCheck className="size-4 shrink-0 text-ok" aria-hidden />
        <span className="font-medium">First event received</span>
        <span className="mono ml-auto text-muted-foreground">{ago(firstEvent)} ago</span>
      </div>
      {issue && (
        <div className="flex flex-col gap-3 border-t border-ok/60 p-3 lg:flex-row lg:items-center">
          <span className="flex min-w-0 flex-1 items-start gap-2.5">
            <LevelGlyph level={issue.level} className="mt-1 shrink-0" />
            <span className="min-w-0 break-words">{issue.title}</span>
          </span>
          <Button asChild variant="default" className="max-lg:h-11">
            <Link to="/$org/issues/$issueId" params={{ org, issueId: issue.id }}>
              Open issue
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
