import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

// Asks before something that can't be taken back. The confirm button says what it does.
export function ConfirmDialog({
  open,
  title,
  detail,
  confirm,
  destructive,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  detail: ReactNode
  confirm: string
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="p-5">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="mt-2">{detail}</DialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button>Cancel</Button>
          </DialogClose>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => {
              onClose()
              onConfirm()
            }}
          >
            {confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
