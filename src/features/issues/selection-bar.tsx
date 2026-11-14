import { Ellipsis, X } from 'lucide-react'
import type { IssueStatus } from '@/api/issues'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import type { SelectionOffer } from './selection'
import { ACTION } from './status'

type Props = {
  offer: SelectionOffer
  // How many issues "all matching" would cover.
  matching: string | undefined
  onStatus: (status: IssueStatus) => void
  onAssign: () => void
  onMerge: () => void
  onDelete: () => void
  onClear: () => void
  onSelectAllMatching: () => void
}

// The selection's actions in the page bar.
export function SelectionBar({ offer, matching, onStatus, onAssign, onMerge, onDelete, onClear, onSelectAllMatching }: Props) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2" role="toolbar" aria-label="Selection">
      <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Clear selection">
        <X />
      </Button>
      <span className="font-medium">
        <span className="mono">{offer.count}</span> selected
      </span>
      {offer.canSelectAllMatching && (
        <Button variant="link" onClick={onSelectAllMatching}>
          Select all {matching} matching
        </Button>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        {offer.statuses.map((action, index) => (
          <Button key={action.status} size="sm" variant={index === 0 ? 'default' : 'outline'} onClick={() => onStatus(action.status)}>
            {action.action}
            <Kbd>{action.key}</Kbd>
          </Button>
        ))}
        {offer.canAssign && (
          <Button size="sm" onClick={onAssign}>
            {ACTION.assign.label}
            <Kbd>{ACTION.assign.key}</Kbd>
          </Button>
        )}
        {offer.canMerge && (
          <Button size="sm" onClick={onMerge}>
            {ACTION.merge.label}
            <Kbd>{ACTION.merge.key}</Kbd>
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  )
}

// The same actions on a phone, in a bar that takes the place of the tab bar.
export function SelectionSheet({ offer, matching, onStatus, onAssign, onMerge, onDelete, onClear, onSelectAllMatching }: Props) {
  return (
    <div role="toolbar" aria-label="Selection" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      {offer.canSelectAllMatching && (
        <button type="button" onClick={onSelectAllMatching} className="flex h-11 w-full items-center justify-center border-b text-sm text-brand">
          Select all {matching} matching
        </button>
      )}
      <div className="flex h-14 items-center gap-1.5 px-1.5">
        <Button variant="ghost" size="icon-touch" onClick={onClear} aria-label="Clear selection">
          <X />
        </Button>
        <span className="mr-auto font-medium">
          <span className="mono">{offer.count}</span> selected
        </span>
        {offer.statuses.slice(0, 2).map((action, index) => (
          <Button key={action.status} size="touch" variant={index === 0 ? 'default' : 'outline'} onClick={() => onStatus(action.status)}>
            {action.action}
          </Button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-touch" aria-label="More actions">
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {offer.statuses.slice(2).map((action) => (
              <DropdownMenuItem key={action.status} onSelect={() => onStatus(action.status)}>
                {action.action}
              </DropdownMenuItem>
            ))}
            {offer.canAssign && <DropdownMenuItem onSelect={onAssign}>{ACTION.assign.label}</DropdownMenuItem>}
            {offer.canMerge && <DropdownMenuItem onSelect={onMerge}>{ACTION.merge.label}</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={onDelete}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
