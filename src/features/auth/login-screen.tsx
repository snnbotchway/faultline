import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { SessionStatus, auth, sessionQuery } from '@/api/auth'
import { instanceSettingsQuery, loginSettingsQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { Field, FormAlert, SUBMIT } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AuthFrame, AuthLinks, AuthNote } from './frame'
import { SignInForm } from './forms'
import { LoginNotice, useSessionForm } from './session-form'
import { SocialButtons } from './social'
import { TwoStepCheck } from './two-step'

// A provider signed the person in but gave no email address, so the account cannot be created until they give one.
function ProviderSignup({ provider }: { provider: string | undefined }) {
  const form = useSessionForm('create your account')
  const [email, setEmail] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    await form.proceed(await form.submit(event, () => auth.providerSignup(email.trim())))
  }
  return (
    <AuthFrame title={`${provider ?? 'Your provider'} didn't share an email`}>
      <form noValidate className="space-y-4" onSubmit={(event) => void submit(event)}>
        <FormAlert>{form.message}</FormAlert>
        <Field label="Email" error={form.fields.email}>
          {(field) => <Input {...field} name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoFocus required className="h-10" />}
        </Field>
        <Button type="submit" variant="default" className={SUBMIT} disabled={form.busy} aria-busy={form.busy}>
          Create account
        </Button>
      </form>
      <AuthLinks>
        <Button variant="link" onClick={() => void form.startOver()}>
          Use another account
        </Button>
      </AuthLinks>
    </AuthFrame>
  )
}

/**
 * Sign-in and the steps that can follow it. `org` narrows the provider buttons to one organization's own
 * (its `/login/:org` page); `next` is where to go afterwards.
 */
export function LoginScreen({ next, org, notice }: { next: string | undefined; org?: string; notice?: LoginNotice }) {
  const session = useQuery(sessionQuery).data
  const settings = useQuery(instanceSettingsQuery).data
  const orgSettings = useQuery({ ...loginSettingsQuery(org ?? ''), enabled: !!org }).data
  const form = useSessionForm('sign you in')
  const [timedOut, setTimedOut] = useState(false)

  if (session?.status === SessionStatus.mfaPending)
    return (
      <AuthFrame title="Two-step verification">
        <TwoStepCheck types={session.mfaTypes} onTimedOut={() => setTimedOut(true)} />
      </AuthFrame>
    )
  if (session?.status === SessionStatus.providerSignup) return <ProviderSignup provider={session.provider} />

  return (
    <AuthFrame title="Sign in">
      {org && <p className="mono -mt-3 mb-5 text-muted-foreground">{org}</p>}
      {notice === LoginNotice.passwordChanged && <AuthNote>Password changed. Sign in with the new one.</AuthNote>}
      {notice === LoginNotice.socialFailed && <FormAlert className="mb-4">That sign-in didn't go through. Try again, or use your email and password.</FormAlert>}
      {timedOut && <FormAlert className="mb-4">Sign-in timed out. Sign in again.</FormAlert>}
      <SignInForm
        onSession={(result) => {
          setTimedOut(false)
          void form.proceed(result)
        }}
      />
      <SocialButtons apps={org ? orgSettings?.socialApps : settings?.socialApps} next={next} />
      <AuthLinks>
        <Button variant="link" asChild>
          <Link to="/reset-password">Forgot password?</Link>
        </Button>
        {settings?.enableUserRegistration && (
          <Button variant="link" asChild>
            <Link to="/register" search={{ next }}>
              Create account
            </Link>
          </Button>
        )}
      </AuthLinks>
    </AuthFrame>
  )
}
