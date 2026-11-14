import { useState } from 'react'
import { account, accountKeys, type LinkedAccount } from '@/api/account'
import { AuthProcess, redirectToProvider } from '@/api/auth'
import type { InstanceSettings } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { TaskDialog } from '@/components/ui/task-dialog'
import { FULL_BUTTON, FieldError } from '@/components/ui/field'
import { providerName } from './format'
import { RowButton } from './rows'
import { useAction } from './use-action'

type SocialApp = InstanceSettings['socialApps'][number]

function LinkedRow({ linked, name }: { linked: LinkedAccount; name: string }) {
  const [confirming, setConfirming] = useState(false)
  const disconnect = useAction(() => account.disconnect(linked), { action: `disconnect ${name}`, refresh: [accountKeys.user] })
  return (
    <li className="border-b py-2">
      <div className="flex min-h-8 items-center gap-x-3">
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3">
          <span className="font-medium">{name}</span>
          <span className="mono min-w-0 [overflow-wrap:anywhere] text-muted-foreground">{linked.email ?? linked.username}</span>
        </span>
        <span className="flex shrink-0 items-center gap-x-4">
          {confirming ? (
            <>
              <RowButton danger disabled={disconnect.busy} onClick={() => void disconnect.run()}>
                Disconnect it
              </RowButton>
              <RowButton onClick={() => setConfirming(false)}>Keep</RowButton>
            </>
          ) : (
            <RowButton danger onClick={() => setConfirming(true)}>Disconnect</RowButton>
          )}
        </span>
      </div>
      <FieldError className="pb-1">{disconnect.message}</FieldError>
    </li>
  )
}

// The accounts at other providers this person can sign in with, and the providers still to connect.
export function LinkedDialog({ open, onClose, linked, apps }: { open: boolean; onClose: () => void; linked: LinkedAccount[]; apps: SocialApp[] }) {
  const unlinked = apps.filter((app) => !linked.some((item) => item.provider === app.provider))
  return (
    <TaskDialog open={open} onClose={onClose} title="Linked accounts" done quietFocus>
      {linked.length > 0 && (
        <ul className="border-t">
          {linked.map((item) => (
            <LinkedRow key={`${item.provider}:${item.uid}`} linked={item} name={providerName(apps, item.provider)} />
          ))}
        </ul>
      )}
      {unlinked.length > 0 && (
        <div className={linked.length > 0 ? 'mt-4 space-y-2' : 'space-y-2'}>
          {unlinked.map((app) => (
            <Button key={app.provider} className={FULL_BUTTON} onClick={() => redirectToProvider(app.provider, '/profile', AuthProcess.connect)}>
              Connect {app.name}
            </Button>
          ))}
        </div>
      )}
    </TaskDialog>
  )
}
