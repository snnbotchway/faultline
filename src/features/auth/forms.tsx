import { useState } from 'react'
import { auth, type Session } from '@/api/auth'
import { FULL_BUTTON, Field, FormAlert, PasswordInput, SubmitButton } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useT } from '@/i18n'
import { useSessionForm } from './session-form'

type Props = {
  // An address the screen already knows, such as the one an invitation was sent to.
  email?: string
  action?: string
  // Called with whatever the backend made of the attempt: signed in, or a step still to do.
  onSession: (session: Session) => void
}

function useCredentials(email = '') {
  const [value, setValue] = useState({ email, password: '' })
  return { value, set: (field: keyof typeof value) => (event: { target: { value: string } }) => setValue({ ...value, [field]: event.target.value }) }
}

export function SignInForm({ email, action, onSession }: Props) {
  const t = useT().auth
  const form = useSessionForm(t.signInAction)
  const { value, set } = useCredentials(email)
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) =>
        void form.submit(event, () => auth.login({ email: value.email.trim(), password: value.password })).then((session) => session && onSession(session))
      }
    >
      <FormAlert>{form.message}</FormAlert>
      <Field label={t.email} error={form.fields.email}>
        {(field) => <Input {...field} name="email" type="email" value={value.email} onChange={set('email')} autoComplete="username" autoFocus={!email} required className="h-10" />}
      </Field>
      <Field label={t.password} error={form.fields.password}>
        {(field) => <PasswordInput {...field} name="password" value={value.password} onChange={set('password')} autoComplete="current-password" autoFocus={!!email} required />}
      </Field>
      <SubmitButton className={FULL_BUTTON} busy={form.busy}>
        {action ?? t.signIn}
      </SubmitButton>
    </form>
  )
}

export function SignUpForm({ email, action, onSession }: Props) {
  const t = useT().auth
  const form = useSessionForm(t.createAccountAction)
  const { value, set } = useCredentials(email)
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => void form.submit(event, () => auth.signup({ email: value.email.trim(), password: value.password })).then((session) => session && onSession(session))}
    >
      <FormAlert>{form.message}</FormAlert>
      <Field label={t.email} error={form.fields.email}>
        {(field) => <Input {...field} name="email" type="email" value={value.email} onChange={set('email')} autoComplete="username" autoFocus={!email} required className="h-10" />}
      </Field>
      <Field label={t.password} aside={t.passwordRule} error={form.fields.password}>
        {(field) => <PasswordInput {...field} name="password" value={value.password} onChange={set('password')} autoComplete="new-password" autoFocus={!!email} required minLength={8} />}
      </Field>
      <SubmitButton className={FULL_BUTTON} busy={form.busy}>
        {action ?? t.createAccount}
      </SubmitButton>
    </form>
  )
}
