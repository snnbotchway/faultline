import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './dialog'

/**
 * A short task that keeps its page behind it. A centred dialog on a desktop; on a phone a sheet
 * from the bottom edge, so the page's bars stay visible and the buttons sit in thumb reach.
 */
export function TaskDialog({
  open,
  onClose,
  title,
  step,
  description,
  done,
  quietFocus,
  modal,
  className,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  // "Step 1 of 2", for a task with more than one screen.
  step?: string
  description?: ReactNode
  // A list that changes as you go has no button of its own to finish on; this gives the dialog one.
  done?: boolean
  // Focus normally lands in the task's first field. This puts it on the dialog itself, for a list or a confirmation,
  // where a focused first control would look like the thing to press.
  quietFocus?: boolean
  // Stays open when the page behind it is tapped: for something shown only once.
  modal?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        // Radix warns about a dialog with no description; most tasks here are named fully by their title.
        {...(description ? {} : { 'aria-describedby': undefined })}
        onInteractOutside={modal ? (event) => event.preventDefault() : undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          const dialog = event.currentTarget as HTMLElement
          const field = quietFocus ? null : dialog.querySelector<HTMLElement>('input:not([type=hidden]), textarea')
          ;(field ?? dialog).focus()
        }}
        className={cn(
          'max-h-[calc(100dvh-6rem)] overflow-y-auto p-5',
          'max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[calc(100dvh-5.5rem)] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:border-x-0 max-sm:border-b-0 max-sm:data-[state=open]:slide-in-from-bottom-4',
          // The pinned buttons carry the sheet's bottom padding, so they sit flush with its edge.
          'max-sm:has-[[data-task-actions]]:pb-0',
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <DialogTitle>{title}</DialogTitle>
          {step && <span className="label-caps shrink-0">{step}</span>}
          {done && (
            <DialogClose asChild>
              <Button size="sm" className="max-lg:h-11">
                Done
              </Button>
            </DialogClose>
          )}
        </div>
        {description && <DialogDescription className="-mt-2 mb-4">{description}</DialogDescription>}
        {children}
      </DialogContent>
    </Dialog>
  )
}

// The task's buttons, main action first. Pinned along the bottom of the sheet on a phone.
export function TaskActions({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      data-task-actions
      className={cn(
        'flex flex-wrap gap-2 pt-1 [&>*]:h-10 max-lg:[&>*]:h-11',
        'max-sm:sticky max-sm:bottom-0 max-sm:-mx-5 max-sm:border-t max-sm:bg-popover max-sm:px-5 max-sm:pt-3 max-sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] max-sm:[&>*]:flex-1',
        className,
      )}
    >
      {children}
    </div>
  )
}

// "Are you sure" for something that cannot be undone. The button repeats what will happen.
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  action,
  busy,
  error,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  action: string
  busy?: boolean
  error?: string
  onConfirm: () => void
}) {
  return (
    <TaskDialog open={open} onClose={onClose} title={title} description={description} quietFocus>
      {error && (
        <p className="prose-text mb-4 border border-destructive px-3 py-2 text-destructive" role="alert">
          {error}
        </p>
      )}
      <TaskActions className="sm:justify-end">
        <Button variant="destructive" disabled={busy} aria-busy={busy} onClick={onConfirm} className="sm:order-2">
          {action}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </TaskActions>
    </TaskDialog>
  )
}
