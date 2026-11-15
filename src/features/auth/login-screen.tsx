import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { SessionStatus, auth, sessionQuery } from '@/api/auth'
import { instanceSettingsQuery, loginSettingsQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { FULL_BUTTON, Field, FormAlert, SubmitButton } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useT } from '@/i18n'
import { AuthFrame, AuthLinks, AuthNote } from './frame'
import { SignInForm } from './forms'
import { LoginNotice, useSessionForm } from './session-form'
import { SocialButtons } from './social'
import { TwoStepCheck } from './two-step'

// A provider signed the person in but gave no email address, so the account cannot be created until they give one.
function ProviderSignup({ provider }: { provider: string | undefined }) {
  const t = useT().auth
  const form = useSessionForm(t.createAccountAction)
  const [email, setEmail] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    await form.proceed(await form.submit(event, () => auth.providerSignup(email.trim())))
  }
  return (
    <AuthFrame title={t.login.providerNoEmail(provider)}>
      <form noValidate className="space-y-4" onSubmit={(event) => void submit(event)}>
        <FormAlert>{form.message}</FormAlert>
        <Field label={t.email} error={form.fields.email}>
          {(field) => <Input {...field} name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoFocus required className="h-10" />}
        </Field>
        <SubmitButton className={FULL_BUTTON} busy={form.busy}>
          {t.createAccount}
        </SubmitButton>
      </form>
      <AuthLinks>
        <Button variant="link" onClick={() => void form.startOver()}>
          {t.useAnotherAccount}
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
  const t = useT().auth
  const form = useSessionForm(t.signInAction)
  const [timedOut, setTimedOut] = useState(false)

  if (session?.status === SessionStatus.mfaPending)
    return (
      <AuthFrame title={t.twoStep.title}>
        <TwoStepCheck types={session.mfaTypes} onTimedOut={() => setTimedOut(true)} />
      </AuthFrame>
    )
  if (session?.status === SessionStatus.providerSignup) return <ProviderSignup provider={session.provider} />

  return (
    <AuthFrame title={t.signIn}>
      {org && <p className="mono -mt-3 mb-5 text-muted-foreground">{org}</p>}
      {notice === LoginNotice.passwordChanged && <AuthNote>{t.login.passwordChanged}</AuthNote>}
      {notice === LoginNotice.socialFailed && <FormAlert className="mb-4">{t.login.socialFailed}</FormAlert>}
      {timedOut && <FormAlert className="mb-4">{t.login.timedOut}</FormAlert>}
      <SignInForm
        onSession={(result) => {
          setTimedOut(false)
          void form.proceed(result)
        }}
      />
      <SocialButtons apps={org ? orgSettings?.socialApps : settings?.socialApps} next={next} />
      <AuthLinks>
        <Button variant="link" asChild>
          <Link to="/reset-password">{t.forgotPassword}</Link>
        </Button>
        {settings?.enableUserRegistration && (
          <Button variant="link" asChild>
            <Link to="/register" search={{ next }}>
              {t.createAccount}
            </Link>
          </Button>
        )}
      </AuthLinks>
    </AuthFrame>
  )
}
