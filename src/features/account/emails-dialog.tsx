import { useState } from 'react'
import { account, accountKeys, type EmailAddress } from '@/api/account'
import { FIELD_BUTTON, Field, FieldError, SubmitButton } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { TaskDialog } from '@/components/ui/task-dialog'
import { RowButton } from '@/components/ui/row-button'
import { useT } from '@/i18n'
import { Tag } from './rows'
import { useAction } from './use-action'

const refresh = [accountKeys.emails, accountKeys.user]

function EmailRow({ address, canSend }: { address: EmailAddress; canSend: boolean }) {
  const [removing, setRemoving] = useState(false)
  const [sent, setSent] = useState(false)
  const { account: { emails: text }, common } = useT()
  const makePrimary = useAction(() => account.makePrimary(address.email), { action: text.makePrimaryAction, refresh })
  const remove = useAction(() => account.removeEmail(address.email), { action: text.removeAction, refresh })
  const send = useAction(() => account.sendVerification(address.email), { action: text.sendAction, onDone: () => setSent(true) })
  const error = makePrimary.message || remove.message || send.message

  return (
    <li className="border-b py-2">
      <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="mono min-w-0 [overflow-wrap:anywhere]">{address.email}</span>
        {address.isPrimary && <Tag>{text.primary}</Tag>}
        {!address.isVerified && <Tag warning>{text.notVerified}</Tag>}
        <span className="ml-auto flex flex-wrap items-center justify-end gap-x-4">
          {removing ? (
            <>
              <RowButton danger disabled={remove.busy} onClick={() => void remove.run()}>
                {common.removeIt}
              </RowButton>
              <RowButton onClick={() => setRemoving(false)}>{common.keep}</RowButton>
            </>
          ) : (
            <>
              {!address.isVerified &&
                canSend &&
                (sent ? (
                  <span className="text-sm text-muted-foreground" role="status">
                    {text.linkSent}
                  </span>
                ) : (
                  <RowButton disabled={send.busy} onClick={() => void send.run()}>
                    {text.sendAgain}
                  </RowButton>
                ))}
              {address.isVerified && !address.isPrimary && (
                <RowButton disabled={makePrimary.busy} onClick={() => void makePrimary.run()}>
                  {text.makePrimary}
                </RowButton>
              )}
              {!address.isPrimary && (
                <RowButton danger onClick={() => setRemoving(true)}>
                  {common.remove}
                </RowButton>
              )}
            </>
          )}
        </span>
      </div>
      <FieldError className="pb-1">{error}</FieldError>
    </li>
  )
}

function AddEmail() {
  const [email, setEmail] = useState('')
  const text = useT().account.emails
  const add = useAction(() => account.addEmail(email.trim()), { action: text.addAction, refresh, onDone: () => setEmail('') })
  return (
    <form noValidate className="mt-4" onSubmit={(event) => void add.submit(event)}>
      <Field label={text.add} error={add.fields.email || add.message}>
        {(field) => (
          <div className="flex gap-2">
            <Input {...field} name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="h-10" />
            <SubmitButton variant="outline" className={FIELD_BUTTON} busy={add.busy}>
              {text.addButton}
            </SubmitButton>
          </div>
        )}
      </Field>
    </form>
  )
}

// `canSend` is false on a server that cannot send email: there is no link to send again.
export function EmailsDialog({ open, onClose, emails, canSend }: { open: boolean; onClose: () => void; emails: EmailAddress[]; canSend: boolean }) {
  const t = useT()
  return (
    <TaskDialog open={open} onClose={onClose} title={t.account.emails.title} done quietFocus>
      <ul className="border-t">
        {emails.map((address) => (
          <EmailRow key={address.email} address={address} canSend={canSend} />
        ))}
      </ul>
      <AddEmail />
    </TaskDialog>
  )
}
