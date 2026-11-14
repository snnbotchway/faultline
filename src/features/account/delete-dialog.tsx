import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { account, deleteBlockersQuery } from '@/api/account'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog, TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { forgetSession } from '@/lib/session'
import { useAction } from './use-action'

const list = new Intl.ListFormat('en', { type: 'conjunction' })

function Names({ names }: { names: string[] }) {
  return <span className="font-medium text-foreground">{list.format(names)}</span>
}

/**
 * Deleting the account. The backend refuses while the user owns an organization or is the last member of one,
 * so those are named first, with what to do about them. It asks for no password, so neither does this.
 */
export function DeleteAccountDialog({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const blockers = useQuery({ ...deleteBlockersQuery(userId), enabled: open })
  const remove = useAction(account.delete, {
    action: 'delete your account',
    onDone: () => {
      forgetSession(queryClient)
      void navigate({ to: '/login' })
    },
  })

  if (open && blockers.isPending)
    return (
      <TaskDialog open onClose={onClose} title="Delete your account?" quietFocus>
        <Skeleton className="h-10" />
      </TaskDialog>
    )

  // If they could not be read, the backend's own refusal still says what to do.
  const owned = blockers.data?.owned ?? []
  const alone = (blockers.data?.alone ?? []).filter((name) => !owned.includes(name))
  if (owned.length > 0 || alone.length > 0)
    return (
      <TaskDialog open={open} onClose={onClose} title="Your account can't be deleted yet" quietFocus>
        <div className="prose-text mb-4 space-y-2 text-muted-foreground">
          {owned.length > 0 && (
            <p>
              You own <Names names={owned} />. Transfer {owned.length === 1 ? 'it' : 'them'} to another member, or delete {owned.length === 1 ? 'it' : 'them'}, first.
            </p>
          )}
          {alone.length > 0 && (
            <p>
              You're the only member of <Names names={alone} />. Add someone, or delete {alone.length === 1 ? 'it' : 'them'}, first.
            </p>
          )}
        </div>
        <TaskActions className="sm:justify-end">
          <Button onClick={onClose}>Close</Button>
        </TaskActions>
      </TaskDialog>
    )

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Delete your account?"
      description="This can't be undone. Your API tokens stop working."
      action="Delete account"
      busy={remove.busy}
      error={remove.message}
      onConfirm={() => void remove.run()}
    />
  )
}
