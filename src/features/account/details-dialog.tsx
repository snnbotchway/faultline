import { useId, useState, type FormEvent } from 'react'
import { account, accountKeys, type CurrentUser } from '@/api/account'
import { Button } from '@/components/ui/button'
import { Field, FormAlert, SubmitButton } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { useT } from '@/i18n'
import { useAction } from './use-action'

const TIME_ZONES = Intl.supportedValuesOf('timeZone')

function DetailsForm({ user, onClose }: { user: CurrentUser; onClose: () => void }) {
  const [name, setName] = useState(user.name ?? '')
  const [timezone, setTimezone] = useState(user.options.timezone ?? '')
  const listId = useId()
  const { account: text, common } = useT()
  const save = useAction(() => account.update({ name, options: { ...user.options, timezone: timezone || null } }), {
    action: text.details.action,
    refresh: [accountKeys.user],
    onDone: onClose,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    // The backend only knows the zones the browser lists; UTC is one it accepts without listing.
    const known = !timezone || timezone === 'UTC' || TIME_ZONES.includes(timezone)
    void save.submit(event, undefined, { fields: known ? {} : { timezone: text.details.pickZone } })
  }

  return (
    <form noValidate className="space-y-4" onSubmit={submit}>
      <FormAlert>{save.message}</FormAlert>
      <Field label={text.rows.name} error={save.fields.name}>
        {(field) => <Input {...field} name="name" className="h-10" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />}
      </Field>
      <Field label={text.rows.timeZone} error={save.fields.timezone}>
        {(field) => (
          <>
            <Input {...field} name="timezone" className="h-10 font-mono" list={listId} value={timezone} onChange={(event) => setTimezone(event.target.value)} autoComplete="off" />
            <datalist id={listId}>
              {TIME_ZONES.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      <TaskActions>
        <SubmitButton busy={save.busy}>
          {common.save}
        </SubmitButton>
        <Button onClick={onClose}>{common.cancel}</Button>
      </TaskActions>
    </form>
  )
}

export function DetailsDialog({ open, onClose, user }: { open: boolean; onClose: () => void; user: CurrentUser }) {
  const t = useT()
  return (
    <TaskDialog open={open} onClose={onClose} title={t.account.details.title}>
      <DetailsForm user={user} onClose={onClose} />
    </TaskDialog>
  )
}
