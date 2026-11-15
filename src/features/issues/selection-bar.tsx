import { Ellipsis, X } from 'lucide-react'
import type { IssueStatus } from '@/api/issues'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { useT } from '@/i18n'
import type { SelectionOffer } from './selection'
import { ACTION } from './status'

// What can be done with the selection right now. An action that is not on offer is absent, so the
// toolbars, the palette and the keys cannot disagree about it.
export type SelectionActions = {
  setStatus: (status: IssueStatus) => void
  assign?: () => void
  merge?: () => void
  remove: () => void
  clear: () => void
  selectAllMatching?: () => void
}

type Props = {
  offer: SelectionOffer
  // How many issues "all matching" would cover.
  matching: string | undefined
  actions: SelectionActions
}

// The selection's actions in the page bar.
export function SelectionBar({ offer, matching, actions }: Props) {
  const t = useT()
  const w = t.issues.selection
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2" role="toolbar" aria-label={w.label}>
      <Button variant="ghost" size="icon-sm" onClick={actions.clear} aria-label={w.clear}>
        <X />
      </Button>
      <span className="font-medium whitespace-nowrap">{w.selected(<span className="mono">{offer.count}</span>, offer.count !== '1')}</span>
      {actions.selectAllMatching && (
        <Button variant="link" onClick={actions.selectAllMatching}>
          {w.selectAllMatching(matching ?? '')}
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">
        {offer.statuses.map((action, index) => (
          <Button key={action.status} size="sm" variant={index === 0 ? 'default' : 'outline'} onClick={() => actions.setStatus(action.status)}>
            {action.action}
            <Kbd>{action.key}</Kbd>
          </Button>
        ))}
        {actions.assign && (
          <Button size="sm" onClick={actions.assign}>
            {ACTION.assign.label}
            <Kbd>{ACTION.assign.key}</Kbd>
          </Button>
        )}
        {actions.merge && (
          <Button size="sm" onClick={actions.merge}>
            {ACTION.merge.label}
            <Kbd>{ACTION.merge.key}</Kbd>
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={actions.remove}>
          {t.common.delete}
        </Button>
      </div>
    </div>
  )
}

// The same actions on a phone, in a bar that takes the place of the tab bar.
export function SelectionSheet({ offer, matching, actions }: Props) {
  const t = useT()
  const w = t.issues.selection
  return (
    <div role="toolbar" aria-label={w.label} className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      {actions.selectAllMatching && (
        <button type="button" onClick={actions.selectAllMatching} className="flex h-11 w-full items-center justify-center border-b text-sm text-brand">
          {w.selectAllMatching(matching ?? '')}
        </button>
      )}
      <div className="flex h-14 items-center gap-2 px-2">
        <Button variant="ghost" size="icon-touch" onClick={actions.clear} aria-label={w.clear}>
          <X />
        </Button>
        <span className="mr-auto font-medium whitespace-nowrap">{w.selected(<span className="mono">{offer.count}</span>, offer.count !== '1')}</span>
        {offer.statuses.slice(0, 2).map((action, index) => (
          <Button key={action.status} size="touch" variant={index === 0 ? 'default' : 'outline'} onClick={() => actions.setStatus(action.status)}>
            {action.action}
          </Button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-touch" aria-label={w.moreActions}>
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {offer.statuses.slice(2).map((action) => (
              <DropdownMenuItem key={action.status} onSelect={() => actions.setStatus(action.status)}>
                {action.action}
              </DropdownMenuItem>
            ))}
            {actions.assign && <DropdownMenuItem onSelect={actions.assign}>{ACTION.assign.label}</DropdownMenuItem>}
            {actions.merge && <DropdownMenuItem onSelect={actions.merge}>{ACTION.merge.label}</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={actions.remove}>
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
