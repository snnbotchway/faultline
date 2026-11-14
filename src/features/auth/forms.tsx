import { useState } from 'react'
import { auth, type Session } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Field, FormAlert, PasswordInput } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useSessionForm } from './session-form'

export const SUBMIT = 'h-10 w-full max-lg:h-11'
// The backend's rule; shown because the person cannot see it otherwise.
export const PASSWORD_RULE = '8 or more characters'

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

export function SignInForm({ email, action = 'Sign in', onSession }: Props) {
  const form = useSessionForm('sign you in')
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
      <Field label="Email" error={form.errors.email}>
        {(field) => <Input {...field} name="email" type="email" value={value.email} onChange={set('email')} autoComplete="username" autoFocus={!email} required className="h-10" />}
      </Field>
      <Field label="Password" error={form.errors.password}>
        {(field) => <PasswordInput {...field} name="password" value={value.password} onChange={set('password')} autoComplete="current-password" autoFocus={!!email} required />}
      </Field>
      <Button type="submit" variant="default" className={SUBMIT} disabled={form.busy} aria-busy={form.busy}>
        {action}
      </Button>
    </form>
  )
}

export function SignUpForm({ email, action = 'Create account', onSession }: Props) {
  const form = useSessionForm('create your account')
  const { value, set } = useCredentials(email)
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => void form.submit(event, () => auth.signup({ email: value.email.trim(), password: value.password })).then((session) => session && onSession(session))}
    >
      <FormAlert>{form.message}</FormAlert>
      <Field label="Email" error={form.errors.email}>
        {(field) => <Input {...field} name="email" type="email" value={value.email} onChange={set('email')} autoComplete="username" autoFocus={!email} required className="h-10" />}
      </Field>
      <Field label="Password" aside={PASSWORD_RULE} error={form.errors.password}>
        {(field) => <PasswordInput {...field} name="password" value={value.password} onChange={set('password')} autoComplete="new-password" autoFocus={!!email} required minLength={8} />}
      </Field>
      <Button type="submit" variant="default" className={SUBMIT} disabled={form.busy} aria-busy={form.busy}>
        {action}
      </Button>
    </form>
  )
}
