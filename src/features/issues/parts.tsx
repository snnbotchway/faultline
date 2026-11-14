import { useQuery } from '@tanstack/react-query'
import { UserRound } from 'lucide-react'
import { useState } from 'react'
import type { Issue } from '@/api/issues'
import { membersQuery, teamsQuery } from '@/api/organizations'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Assignee } from './actions'
import { Trend, barHeights } from './trend'

const LEVEL_COLOR: Record<string, string> = {
  fatal: 'text-level-fatal',
  error: 'text-level-error',
  warning: 'text-level-warning',
  info: 'text-level-info',
  debug: 'text-level-debug',
}

// Level by shape as well as colour: square for errors, triangle for warnings, circle for the rest.
export function LevelGlyph({ level, className }: { level: string; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" role="img" aria-label={level} className={cn('size-2.5 shrink-0', LEVEL_COLOR[level] ?? 'text-level-debug', className)}>
      {level === 'fatal' || level === 'error' ? (
        <rect width="10" height="10" fill="currentColor" />
      ) : level === 'warning' ? (
        <path d="M5 0.5 10 9.5H0Z" fill="currentColor" />
      ) : level === 'info' ? (
        <circle cx="5" cy="5" r="4.5" fill="currentColor" />
      ) : (
        <circle cx="5" cy="5" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      )}
    </svg>
  )
}

const initials = (assignee: Assignee) =>
  (assignee.name || assignee.email || '?')
    .split(/[\s@._-]+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

export function AssigneeBadge({ assignee, className }: { assignee: Issue['assignedTo']; className?: string }) {
  if (!assignee) return <UserRound className={cn('size-4 text-muted-foreground', className)} aria-label="Unassigned" />
  return (
    <span
      title={assignee.name || assignee.email || undefined}
      aria-label={`Assigned to ${assignee.name || assignee.email}`}
      className={cn('grid size-5 place-items-center bg-foreground font-mono text-[0.625rem] font-semibold text-background uppercase', className)}
    >
      {initials(assignee)}
    </span>
  )
}

// A short task that keeps its context, so it is a dialog. Typing narrows the list; Enter takes the first match.
export function AssignDialog({
  org,
  open,
  current,
  onClose,
  onPick,
}: {
  org: string
  open: boolean
  current?: Issue['assignedTo']
  onClose: () => void
  onPick: (assignee: Assignee | null) => void
}) {
  const members = useQuery({ ...membersQuery(org), enabled: open }).data ?? []
  const teams = useQuery({ ...teamsQuery(org), enabled: open }).data ?? []
  const [text, setText] = useState('')
  const people: Assignee[] = [
    ...members.filter((member) => member.user).map((member) => ({ type: 'user' as const, id: member.user!.id, name: member.user!.name || member.email, email: member.email })),
    ...teams.map((team) => ({ type: 'team' as const, id: team.id, name: `#${team.slug}`, slug: team.slug })),
  ]
  const shown = people.filter((person) => `${person.name} ${person.email ?? ''}`.toLowerCase().includes(text.toLowerCase()))
  const pick = (assignee: Assignee | null) => {
    onPick(assignee)
    onClose()
    setText('')
  }
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-sm">
        <DialogTitle className="sr-only">Assign</DialogTitle>
        <input
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && shown[0] && pick(shown[0])}
          placeholder="Assign to"
          aria-label="Assign to"
          className="h-11 w-full border-b bg-transparent px-3 outline-none placeholder:text-muted-foreground focus-visible:outline-none max-lg:text-[1rem]"
        />
        <div className="max-h-72 overflow-y-auto py-1">
          {shown.map((person) => (
            <button
              key={`${person.type}:${person.id}`}
              type="button"
              onClick={() => pick(person)}
              className="flex min-h-9 w-full items-center gap-2.5 px-3 text-left hover:bg-accent max-lg:min-h-11"
            >
              <AssigneeBadge assignee={person} />
              <span className="min-w-0 flex-1 truncate">{person.name}</span>
              {current?.type === person.type && current.id === person.id && <span className="label-caps">current</span>}
            </button>
          ))}
          {shown.length === 0 && <p className="px-3 py-3 text-muted-foreground">No one matches.</p>}
          {current && (
            <button type="button" onClick={() => pick(null)} className="flex min-h-9 w-full items-center gap-2.5 border-t px-3 text-left hover:bg-accent max-lg:min-h-11">
              <UserRound className="size-5 p-0.5 text-muted-foreground" />
              Unassign
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const TREND_BAR: Record<Trend, string> = {
  [Trend.new]: 'bg-trend-new',
  [Trend.spiking]: 'bg-foreground/50',
  [Trend.ongoing]: 'bg-foreground/50',
}

// Events per bucket as bars on a zero baseline. `marks` are positions (0 to 1) of releases on the same axis.
export function Trace({
  buckets,
  height,
  peak,
  trend = Trend.ongoing,
  marks = [],
  className,
}: {
  buckets: number[]
  height: number
  peak?: number
  trend?: Trend
  marks?: number[]
  className?: string
}) {
  const heights = barHeights(buckets, height, peak)
  return (
    <div className={cn('relative flex items-end gap-px border-b border-foreground/30', className)} style={{ height: height + 1 }} aria-hidden>
      {marks.map((at) => (
        <span key={at} className="absolute inset-y-0 w-px bg-brand/45" style={{ left: `${at * 100}%` }} />
      ))}
      {heights.map((barHeight, index) => (
        <span
          key={index}
          className={cn('min-w-0 flex-1', trend === Trend.spiking && index === heights.length - 1 ? 'bg-trend-spiking' : TREND_BAR[trend])}
          style={{ height: barHeight }}
        />
      ))}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('block animate-pulse bg-muted', className)} />
}
