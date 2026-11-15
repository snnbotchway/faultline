import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { auth } from '@/api/auth'
import { ApiError, HttpStatus } from '@/api/client'
import { Feature, instanceSettingsQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { FULL_BUTTON, Field, FormAlert, SubmitButton } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AuthFrame, AuthLinks } from '@/features/auth/frame'
import { useT } from '@/i18n'
import { useCountdown } from '@/lib/countdown'
import { useFormRequest } from '@/lib/use-form-request'

export const Route = createFileRoute('/reset-password')({
  loader: ({ context }) => context.queryClient.ensureQueryData(instanceSettingsQuery),
  component: ResetPassword,
})

// Our own pause between sends, so someone who is locked out does not run into the server's limit.
const RESEND_AFTER = 60

const Step = { form: 'form', sent: 'sent', limited: 'limited' } as const
type Step = (typeof Step)[keyof typeof Step]

function BackToSignIn() {
  const t = useT()
  return (
    <Button asChild className="max-lg:h-11">
      <Link to="/login">{t.auth.backToSignIn}</Link>
    </Button>
  )
}

function ResetPassword() {
  const settings = useQuery(instanceSettingsQuery).data
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>(Step.form)
  const [wait, startWait] = useCountdown()
  const { auth: t, common } = useT()
  const request = useFormRequest(t.reset.sendAction)

  // A server that cannot send email cannot send a reset link either.
  if (settings && !settings.enabledFeatures.includes(Feature.email))
    return (
      <AuthFrame title={t.reset.noEmail}>
        <BackToSignIn />
      </AuthFrame>
    )

  // From the form, or again from the "sent" step. Any other failure goes back to the form to show it.
  async function sendLink() {
    try {
      await auth.requestPasswordReset(email.trim())
    } catch (error) {
      const limited = error instanceof ApiError && error.status === HttpStatus.tooManyRequests
      setStep(limited ? Step.limited : Step.form)
      if (!limited) throw error
      // allauth counts reset requests per minute and sends no wait time, so a minute is the wait.
      startWait(RESEND_AFTER)
      return
    }
    setStep(Step.sent)
    startWait(RESEND_AFTER)
  }

  if (step === Step.form)
    return (
      <AuthFrame title={t.reset.title}>
        <form noValidate className="space-y-4" onSubmit={(event) => void request.submit(event, sendLink)}>
          <FormAlert>{request.message}</FormAlert>
          <Field label={t.email} error={request.fields.email}>
            {(field) => <Input {...field} name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" autoFocus required className="h-10" />}
          </Field>
          <SubmitButton className={FULL_BUTTON} busy={request.busy}>
            {t.reset.sendLink}
          </SubmitButton>
        </form>
        <AuthLinks>
          <Button variant="link" asChild>
            <Link to="/login">{t.backToSignIn}</Link>
          </Button>
        </AuthLinks>
      </AuthFrame>
    )

  const limited = step === Step.limited
  return (
    <AuthFrame title={limited ? t.reset.tooMany : t.reset.checkEmail}>
      {!limited && <p className="prose-text mb-4 text-muted-foreground">{t.reset.onItsWay(<span className="mono [overflow-wrap:anywhere] text-foreground">{email}</span>)}</p>}
      <div className="flex flex-wrap gap-2">
        <Button className="max-lg:h-11" disabled={request.busy || wait > 0} aria-busy={request.busy} onClick={() => void request.send(sendLink)}>
          {wait > 0 ? (
            <>
              {t.reset.sendAgainIn} <span className="mono">{common.time.ago.seconds(wait)}</span>
            </>
          ) : (
            t.reset.sendAgain
          )}
        </Button>
        <BackToSignIn />
      </div>
    </AuthFrame>
  )
}
