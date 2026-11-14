import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { issueEventQuery, type Issue, type IssueStatus } from '@/api/issues'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { crumbText, crumbsOf, frameFile, throwingFrame } from './event'
import { exact } from './format'
import { ContextLines } from './stack-trace'
import { statusActions, type StatusView } from './status'

const LAST_CRUMBS = 4

export type RowHandlers = {
  toggle: (id: string) => void
  unfold: (id: string) => void
  assign: (id: string) => void
  setStatus: (id: string, status: IssueStatus) => void
}

// The unfolded row: enough of the latest event to decide what to do without leaving the list.
export function Dossier({ org, issue, view, canWrite, handlers }: { org: string; issue: Issue; view: StatusView; canWrite: boolean; handlers: RowHandlers }) {
  const event = useQuery(issueEventQuery(org, issue.id))
  const frame = event.data && throwingFrame(event.data)
  const crumbs = event.data ? crumbsOf(event.data).slice(-LAST_CRUMBS) : []
  return (
    <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8 border-t bg-card py-4 pr-4 pl-[44px]">
      <section>
        <h3 className="label-caps mb-2">What happened</h3>
        {event.isPending ? (
          <Skeleton className="h-20" />
        ) : (
          <ol className="mono space-y-1">
            {crumbs.map((crumb, index) => (
              <li key={index} className="flex gap-3">
                <span className="w-20 shrink-0 truncate text-muted-foreground">{crumb.category}</span>
                <span className="min-w-0 truncate">{crumbText(crumb)}</span>
              </li>
            ))}
            <li className="flex gap-3 font-semibold text-level-error">
              <span className="w-20 shrink-0">threw</span>
              <span className="min-w-0 truncate">{issue.title}</span>
            </li>
          </ol>
        )}
        <dl className="mono mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">first seen</dt>
          <dd>
            {exact(issue.firstSeen)}
            {issue.firstRelease && <span className="text-muted-foreground"> in {issue.firstRelease.shortVersion}</span>}
          </dd>
          <dt className="text-muted-foreground">last seen</dt>
          <dd>
            {exact(issue.lastSeen)}
            {issue.lastRelease && <span className="text-muted-foreground"> in {issue.lastRelease.shortVersion}</span>}
          </dd>
        </dl>
      </section>
      <section className="min-w-0">
        <h3 className="label-caps mb-2">Where</h3>
        {event.isPending ? (
          <Skeleton className="h-28" />
        ) : frame ? (
          <div className="border">
            <p className="mono truncate border-b bg-muted/60 px-3 py-1.5">
              {frameFile(frame)}
              {frame.lineNo != null && `:${frame.lineNo}`}
              {frame.function && <span className="text-muted-foreground"> in {frame.function}</span>}
            </p>
            <ContextLines frame={frame} />
          </div>
        ) : (
          <p className="mono text-muted-foreground">{issue.culprit}</p>
        )}
        <div className="mt-4 flex justify-end gap-1.5">
          {canWrite && (
            <>
              {statusActions(view).map((action, index) => (
                <Button key={action.status} size="sm" variant={index === 0 ? 'default' : 'outline'} onClick={() => handlers.setStatus(issue.id, action.status)}>
                  {action.action}
                </Button>
              ))}
              <Button size="sm" onClick={() => handlers.assign(issue.id)}>
                Assign
              </Button>
            </>
          )}
          <Button size="sm" asChild>
            <Link to="/$org/issues/$issueId" params={{ org, issueId: issue.id }}>
              Open
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
