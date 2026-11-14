import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function DeleteIssuesDialog({ open, what, onConfirm, onClose }: { open: boolean; what: string; onConfirm: () => void; onClose: () => void }) {
  return <ConfirmDialog open={open} destructive title={`Delete ${what}?`} detail="The events are deleted too. This can't be undone." confirm={`Delete ${what}`} onConfirm={onConfirm} onClose={onClose} />
}
