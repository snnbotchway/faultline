import { Link } from '@tanstack/react-router'
import { ChevronDown, MessageSquare } from 'lucide-react'
import { memo, useEffect, useRef } from 'react'
import { IssueKind, IssueStatus, type Issue } from '@/api/issues'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { plural } from '@/lib/text'
import { cn } from '@/lib/utils'
import { AssigneeBadge } from './assignee'
import { Dossier, type RowHandlers } from './dossier'
import { errorParts } from './event'
import { ago, compact, exact } from './format'
import { LevelGlyph } from './level'
import { ACTION, STATUS, type StatusView } from './status'
import { Trace } from './trace'
import type { Mark, Trend } from './trend'

export const COLUMNS = 'lg:grid-cols-[var(--spacing-check)_minmax(0,5fr)_minmax(0,4fr)_64px_64px_96px_36px]'
const PHONE_COLUMNS = 'grid-cols-[var(--spacing-check)_minmax(0,1fr)_64px]'

export type Row = { issue: Issue; buckets: number[]; trend: Trend }

function IssueTitle({ issue }: { issue: Issue }) {
  const { type, text } = errorParts(issue)
  return (
    <span className={cn('truncate max-lg:line-clamp-2 max-lg:whitespace-normal', !type && 'font-medium')}>
      {type && <span className="error-type">{type} </span>}
      {text}
    </span>
  )
}

const TAG = 'shrink-0 border px-1 text-xs leading-4 uppercase'

type Props = {
  org: string
  row: Row
  marks: Mark[]
  view: StatusView
  selected: boolean
  current: boolean
  unfolded: boolean
  canWrite: boolean
  handlers: RowHandlers
}

// Memoised: moving the cursor or ticking a box re-renders only the rows whose own props changed.
export const IssueRow = memo(function IssueRow({ org, row, marks, view, selected, current, unfolded, canWrite, handlers }: Props) {
  const { issue, buckets, trend } = row
  const ref = useRef<HTMLLIElement>(null)
  const shift = useRef(false)
  useEffect(() => {
    if (current) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [current])
  return (
    <li ref={ref} className="scroll-mt-28 scroll-mb-20 border-b">
      <div
        className={cn(
          'relative grid items-center pr-3 transition-colors duration-100 lg:pr-4',
          PHONE_COLUMNS,
          COLUMNS,
          selected ? 'bg-selected' : current ? 'bg-accent' : 'hover:bg-accent/60',
        )}
      >
        {canWrite ? (
          <Checkbox
            hit
            checked={selected}
            onClick={(event) => (shift.current = event.shiftKey)}
            onCheckedChange={() => handlers.toggle(issue.id, shift.current)} aria-label={`Select ${issue.shortId}`} className="relative z-10 lg:mx-auto" />
        ) : (
          <span />
        )}
        <div className="min-w-0 py-3 lg:py-1">
          <Link
            to="/$org/issues/$issueId"
            params={{ org, issueId: issue.id }}
            className="flex items-center gap-2 max-lg:items-start after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-foreground"
          >
            <LevelGlyph level={issue.level} className="size-3 max-lg:mt-1" />
            <IssueTitle issue={issue} />
          </Link>
          <div className="mono mt-1 flex items-center gap-x-2 pl-5 text-muted-foreground max-lg:flex-wrap">
            <span className="shrink-0">{issue.shortId}</span>
            {issue.type === IssueKind.csp && <span className={TAG}>CSP report</span>}
            {issue.status !== IssueStatus.unresolved && issue.status !== view && <span className={TAG}>{STATUS[issue.status].label}</span>}
            <span className="truncate max-lg:hidden">{issue.culprit}</span>
            <span className="shrink-0 lg:hidden">
              {ago(issue.lastSeen)} · {ago(issue.firstSeen)} old · {plural(compact(issue.count), 'event')}
            </span>
            {issue.numComments > 0 && (
              <span className="flex shrink-0 items-center gap-1">
                <MessageSquare className="size-3" />
                {issue.numComments}
              </span>
            )}
          </div>
        </div>
        <Trace buckets={buckets} trend={trend} marks={marks} height={22} className="lg:mx-4 max-lg:[&>[data-mark]]:hidden" />
        <span className="mono text-right max-lg:hidden">{compact(issue.count)}</span>
        <div className="mono text-right text-muted-foreground max-lg:hidden" title={`First seen ${exact(issue.firstSeen)}`}>
          <time dateTime={issue.lastSeen} title={`Last seen ${exact(issue.lastSeen)}`}>
            {ago(issue.lastSeen)}
          </time>
          <div className="text-xs">{ago(issue.firstSeen)} old</div>
        </div>
        <span className="flex justify-end max-lg:hidden">
          {canWrite ? (
            <button
              type="button"
              onClick={() => handlers.assign(issue.id)}
              aria-label={issue.assignedTo ? `Assigned to ${issue.assignedTo.name}. Change` : ACTION.assign.label}
              title={issue.assignedTo ? issue.assignedTo.name : ACTION.assign.label}
              className="relative z-10 grid size-8 place-items-center hover:bg-card"
            >
              <AssigneeBadge assignee={issue.assignedTo} />
            </button>
          ) : (
            <span className="grid size-8 place-items-center">
              <AssigneeBadge assignee={issue.assignedTo} />
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => handlers.unfold(issue.id)}
          aria-expanded={unfolded}
          aria-label={`Details of ${issue.shortId}`}
          title="Details"
          className="relative z-10 ml-auto grid size-8 place-items-center text-muted-foreground hover:bg-card hover:text-foreground max-lg:hidden"
        >
          <ChevronDown className={cn('size-4 transition-transform duration-200', unfolded && 'rotate-180')} />
        </button>
      </div>
      {unfolded && (
        <div className="max-lg:hidden">
          <Dossier org={org} issue={issue} view={view} canWrite={canWrite} handlers={handlers} />
        </div>
      )}
    </li>
  )
})

export function SkeletonRows() {
  return (
    <ul aria-busy aria-label="Loading issues">
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index} className={cn('grid items-center border-b py-3 pr-3 lg:pr-4', PHONE_COLUMNS, COLUMNS)}>
          <span />
          <div className="space-y-2">
            <Skeleton className="h-3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 lg:mx-4" />
        </li>
      ))}
    </ul>
  )
}
