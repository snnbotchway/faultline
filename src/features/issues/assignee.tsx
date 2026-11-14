import { useQuery } from '@tanstack/react-query'
import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { AssigneeType, type Issue } from '@/api/issues'
import { membersQuery, teamsQuery } from '@/api/organizations'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Assignee } from './actions'

const initials = (assignee: Assignee) =>
  (assignee.name || assignee.email || '?')
    .split(/[\s@._#-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

export function AssigneeBadge({ assignee, className }: { assignee: Issue['assignedTo']; className?: string }) {
  if (!assignee) return <UserRound className={cn('size-4 text-muted-foreground', className)} aria-label="Unassigned" />
  return (
    <span
      title={assignee.name || assignee.email || undefined}
      aria-label={`Assigned to ${assignee.name || assignee.email}`}
      className={cn('grid size-6 place-items-center bg-foreground font-mono text-xs font-semibold text-background uppercase', className)}
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
    ...members.filter((member) => member.user).map((member) => ({ type: AssigneeType.user, id: member.user!.id, name: member.user!.name || member.email, email: member.email })),
    ...teams.map((team) => ({ type: AssigneeType.team, id: team.id, name: `#${team.slug}`, slug: team.slug })),
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
          className="h-11 w-full border-b bg-transparent px-3 outline-none placeholder:text-muted-foreground touch-input focus-visible:outline-none"
        />
        <div className="max-h-72 overflow-y-auto py-1">
          {shown.map((person) => (
            <button
              key={`${person.type}:${person.id}`}
              type="button"
              onClick={() => pick(person)}
              className="flex min-h-9 w-full items-center gap-2 px-3 text-left hover:bg-accent max-lg:min-h-11"
            >
              <AssigneeBadge assignee={person} />
              <span className="min-w-0 flex-1 truncate">{person.name}</span>
              {current?.type === person.type && current.id === person.id && <span className="label-caps">current</span>}
            </button>
          ))}
          {shown.length === 0 && <UserRound className="mx-auto my-4 size-4 text-muted-foreground" aria-hidden />}
          {current && (
            <button type="button" onClick={() => pick(null)} className="flex min-h-9 w-full items-center gap-2 border-t px-3 text-left hover:bg-accent max-lg:min-h-11">
              <span className="grid size-6 place-items-center">
                <UserRound className="size-4 text-muted-foreground" />
              </span>
              Unassign
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
