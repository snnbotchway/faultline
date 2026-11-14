import { useState } from 'react'
import { account, accountKeys, type EmailAddress } from '@/api/account'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { TaskDialog } from '@/components/ui/task-dialog'
import { RowButton, Tag } from './rows'
import { useAction } from './use-action'

const refresh = [accountKeys.emails, accountKeys.user]

function EmailRow({ address, canSend }: { address: EmailAddress; canSend: boolean }) {
  const [removing, setRemoving] = useState(false)
  const [sent, setSent] = useState(false)
  const makePrimary = useAction(() => account.makePrimary(address.email), { action: 'make that your primary email', refresh })
  const remove = useAction(() => account.removeEmail(address.email), { action: 'remove that email', refresh })
  const send = useAction(() => account.sendVerification(address.email), { action: 'send the link', onDone: () => setSent(true) })
  const error = makePrimary.error || remove.error || send.error

  return (
    <li className="border-b py-2">
      <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="mono min-w-0 [overflow-wrap:anywhere]">{address.email}</span>
        {address.isPrimary && <Tag>Primary</Tag>}
        {!address.isVerified && <Tag warning>Not verified</Tag>}
        <span className="ml-auto flex flex-wrap items-center justify-end gap-x-4">
          {removing ? (
            <>
              <RowButton className="text-destructive" disabled={remove.busy} onClick={() => void remove.run()}>
                Remove it
              </RowButton>
              <RowButton onClick={() => setRemoving(false)}>Keep</RowButton>
            </>
          ) : (
            <>
              {!address.isVerified &&
                canSend &&
                (sent ? (
                  <span className="text-sm text-muted-foreground" role="status">
                    Link sent
                  </span>
                ) : (
                  <RowButton disabled={send.busy} onClick={() => void send.run()}>
                    Send link again
                  </RowButton>
                ))}
              {address.isVerified && !address.isPrimary && (
                <RowButton disabled={makePrimary.busy} onClick={() => void makePrimary.run()}>
                  Make primary
                </RowButton>
              )}
              {!address.isPrimary && <RowButton onClick={() => setRemoving(true)}>Remove</RowButton>}
            </>
          )}
        </span>
      </div>
      {error && (
        <p className="prose-text pb-1 text-destructive" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}

function AddEmail() {
  const [email, setEmail] = useState('')
  const add = useAction(() => account.addEmail(email.trim()), { action: 'add that email', refresh, onDone: () => setEmail('') })
  return (
    <form noValidate className="mt-4" onSubmit={(event) => void add.submit(event)}>
      <div className="flex gap-2">
        <Input name="email" type="email" aria-label="Another email" placeholder="another@example.com" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required aria-invalid={!!add.fields.email} className="h-10" />
        <Button type="submit" className="h-10 max-lg:h-11" disabled={add.busy} aria-busy={add.busy}>
          Add email
        </Button>
      </div>
      <FormAlert className="mt-2">{add.fields.email || add.error}</FormAlert>
    </form>
  )
}

// `canSend` is false on a server that cannot send email: there is no link to send again.
export function EmailsDialog({ open, onClose, emails, canSend }: { open: boolean; onClose: () => void; emails: EmailAddress[]; canSend: boolean }) {
  return (
    <TaskDialog open={open} onClose={onClose} title="Emails" done quietFocus>
      <ul className="border-t">
        {emails.map((address) => (
          <EmailRow key={address.email} address={address} canSend={canSend} />
        ))}
      </ul>
      <AddEmail />
    </TaskDialog>
  )
}
