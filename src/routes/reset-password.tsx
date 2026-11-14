import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { auth } from '@/api/auth'
import { ApiError, HttpStatus } from '@/api/client'
import { formProblems, type FormProblems } from '@/api/form-errors'
import { Feature, instanceSettingsQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { Field, FormAlert } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AuthFrame, AuthLinks } from '@/features/auth/frame'
import { SUBMIT } from '@/features/auth/forms'
import { useCountdown } from '@/lib/countdown'
import { checkForm, fieldNames, focusFirstProblem, hasProblems } from '@/lib/form-check'

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
  const [busy, setBusy] = useState(false)
  const [problems, setProblems] = useState<FormProblems>({ fields: {} })
  const [wait, startWait] = useCountdown()

  // A server that cannot send email cannot send a reset link either.
  if (settings && !settings.enabledFeatures.includes(Feature.email))
    return (
      <AuthFrame title="Ask an administrator to reset your password">
        <BackToSignIn />
      </AuthFrame>
    )

  function show(form: HTMLFormElement | null, found: FormProblems) {
    setProblems(found)
    focusFirstProblem(form, found)
  }

  // From the form, or again from the "sent" step, which has no form.
  async function send(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const form = event?.currentTarget ?? null
    const caught = form ? checkForm(form) : { fields: {} }
    show(form, caught)
    if (hasProblems(caught)) return
    setBusy(true)
    try {
      await auth.requestPasswordReset(email.trim())
      setStep(Step.sent)
      startWait(RESEND_AFTER)
    } catch (error) {
      if (error instanceof ApiError && error.status === HttpStatus.tooManyRequests) return setStep(Step.limited)
      show(form, formProblems(error, 'send the reset link', form ? fieldNames(form) : []))
      setStep(Step.form)
    } finally {
      setBusy(false)
    }
  }

  if (step === Step.form)
    return (
      <AuthFrame title="Reset password">
        <form noValidate className="space-y-4" onSubmit={(event) => void send(event)}>
          <FormAlert>{problems.message}</FormAlert>
          <Field label="Email" error={problems.fields.email}>
            {(field) => <Input {...field} name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" autoFocus required className="h-10" />}
          </Field>
          <Button type="submit" variant="default" className={SUBMIT} disabled={busy} aria-busy={busy}>
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
        <Button className="max-lg:h-11" disabled={busy || (!limited && wait > 0)} aria-busy={busy} onClick={() => void send()}>
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
