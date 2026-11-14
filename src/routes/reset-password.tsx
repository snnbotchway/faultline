import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { auth } from '@/api/auth'
import { ApiError, HttpStatus } from '@/api/client'
import { Feature, instanceSettingsQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { Field, FormAlert } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AuthFrame, AuthLinks } from '@/features/auth/frame'
import { SUBMIT } from '@/features/auth/forms'
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
  return (
    <Button asChild className="max-lg:h-11">
      <Link to="/login">Back to sign in</Link>
    </Button>
  )
}

function ResetPassword() {
  const settings = useQuery(instanceSettingsQuery).data
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>(Step.form)
  const [wait, startWait] = useCountdown()
  const request = useFormRequest('send the reset link')

  // A server that cannot send email cannot send a reset link either.
  if (settings && !settings.enabledFeatures.includes(Feature.email))
    return (
      <AuthFrame title="Ask an administrator to reset your password">
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
      if (limited) return
      throw error
    }
    setStep(Step.sent)
    startWait(RESEND_AFTER)
  }

  if (step === Step.form)
    return (
      <AuthFrame title="Reset password">
        <form noValidate className="space-y-4" onSubmit={(event) => void request.submit(event, sendLink)}>
          <FormAlert>{request.problems.message}</FormAlert>
          <Field label="Email" error={request.problems.fields.email}>
            {(field) => <Input {...field} name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" autoFocus required className="h-10" />}
          </Field>
          <Button type="submit" variant="default" className={SUBMIT} disabled={request.busy} aria-busy={request.busy}>
            Send reset link
          </Button>
        </form>
        <AuthLinks>
          <Button variant="link" asChild>
            <Link to="/login">Back to sign in</Link>
          </Button>
        </AuthLinks>
      </AuthFrame>
    )

  const limited = step === Step.limited
  return (
    <AuthFrame title={limited ? 'Too many reset emails' : 'Check your email'}>
      <p className="prose-text mb-4 text-muted-foreground">
        {limited ? (
          'Wait a few minutes, then send it again.'
        ) : (
          <>
            If <span className="mono [overflow-wrap:anywhere] text-foreground">{email}</span> has an account, a reset link is on its way.
          </>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button className="max-lg:h-11" disabled={request.busy || (!limited && wait > 0)} aria-busy={request.busy} onClick={() => void request.send(sendLink)}>
          {!limited && wait > 0 ? (
            <>
              Send again in <span className="mono">{wait}s</span>
            </>
          ) : (
            'Send again'
          )}
        </Button>
        <BackToSignIn />
      </div>
    </AuthFrame>
  )
}
