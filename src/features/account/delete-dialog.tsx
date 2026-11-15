import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { account, deleteBlockersQuery } from '@/api/account'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog, TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { localized, useT } from '@/i18n'
import { forgetSession } from '@/lib/session'
import { useAction } from './use-action'

const list = localized((tag) => new Intl.ListFormat(tag, { type: 'conjunction' }))

function Names({ names }: { names: string[] }) {
  return <span className="font-medium text-foreground">{list().format(names)}</span>
}

/**
 * Deleting the account. The backend refuses while the user owns an organization or is the last member of one,
 * so those are named first, with what to do about them. It asks for no password, so neither does this.
 */
export function DeleteAccountDialog({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const blockers = useQuery({ ...deleteBlockersQuery(userId), enabled: open })
  const { account: { delete: text }, common } = useT()
  const remove = useAction(account.delete, {
    action: text.deleteAction,
    onDone: () => {
      forgetSession(queryClient)
      void navigate({ to: '/login' })
    },
  })

  if (open && blockers.isPending)
    return (
      <TaskDialog open onClose={onClose} title={text.title} quietFocus>
        <Skeleton className="h-10" />
      </TaskDialog>
    )

  // If they could not be read, the backend's own refusal still says what to do.
  const owned = blockers.data?.owned ?? []
  const alone = (blockers.data?.alone ?? []).filter((name) => !owned.includes(name))
  if (owned.length > 0 || alone.length > 0)
    return (
      <TaskDialog open={open} onClose={onClose} title={text.blocked} quietFocus>
        <div className="prose-text mb-4 space-y-2 text-muted-foreground">
          {owned.length > 0 && <p>{text.owned(<Names names={owned} />, owned.length)}</p>}
          {alone.length > 0 && <p>{text.alone(<Names names={alone} />, alone.length)}</p>}
        </div>
        <TaskActions className="sm:justify-end">
          <Button onClick={onClose}>{common.close}</Button>
        </TaskActions>
      </TaskDialog>
    )

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={text.title}
      description={text.cantUndo}
      action={text.action}
      busy={remove.busy}
      error={remove.message}
      onConfirm={() => void remove.run()}
    />
  )
}
