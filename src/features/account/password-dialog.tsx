import { useState } from 'react'
import { account, accountKeys } from '@/api/account'
import { Button } from '@/components/ui/button'
import { Field, FormAlert, PasswordInput, SubmitButton } from '@/components/ui/field'
import { TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { useT } from '@/i18n'
import { notify } from '@/lib/notice'
import { useAction } from './use-action'

function PasswordForm({ hasPassword, onClose }: { hasPassword: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const { account: { password: text }, auth, common } = useT()
  const change = useAction(() => account.changePassword({ current: hasPassword ? current : undefined, next }), {
    action: hasPassword ? text.changeAction : text.setAction,
    refresh: [accountKeys.user],
    onDone: () => {
      onClose()
      notify(hasPassword ? text.changed : text.setDone)
    },
  })
  return (
    <form noValidate className="space-y-4" onSubmit={(event) => void change.submit(event)}>
      <FormAlert>{change.message}</FormAlert>
      {hasPassword && (
        <Field label={text.current} error={change.fields.current_password}>
          {(field) => <PasswordInput {...field} name="current_password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" required />}
        </Field>
      )}
      <Field label={text.new} aside={auth.passwordRule} error={change.fields.new_password}>
        {(field) => <PasswordInput {...field} name="new_password" value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" required minLength={8} />}
      </Field>
      <TaskActions>
        <SubmitButton busy={change.busy}>
          {hasPassword ? text.change : text.set}
        </SubmitButton>
        <Button onClick={onClose}>{common.cancel}</Button>
      </TaskActions>
    </form>
  )
}

// An account that only ever signed in through a provider has no password yet; it sets one without the current one.
export function PasswordDialog({ open, onClose, hasPassword }: { open: boolean; onClose: () => void; hasPassword: boolean }) {
  const text = useT().account.password
  return (
    <TaskDialog open={open} onClose={onClose} title={hasPassword ? text.change : text.setTitle}>
      <PasswordForm hasPassword={hasPassword} onClose={onClose} />
    </TaskDialog>
  )
}
