import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { SessionStatus, auth } from '@/api/auth'
import { isExpiredLink } from '@/api/form-errors'
import { Button } from '@/components/ui/button'
import { FULL_BUTTON, Field, FormAlert, PasswordInput, SubmitButton } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthFrame } from '@/features/auth/frame'
import { useSessionForm } from '@/features/auth/session-form'
import { useT } from '@/i18n'

// The link in the reset email.
export const Route = createFileRoute('/reset-password_/set-new-password/$key')({ component: SetNewPassword })

function SetNewPassword() {
  const { key } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const usable = useQuery({ queryKey: ['auth', 'reset-key', key], queryFn: () => auth.resetKeyIsValid(key), staleTime: Infinity, retry: false })
  const [expired, setExpired] = useState(false)
  const t = useT().auth
  const form = useSessionForm(t.reset.setAction)
  const [password, setPassword] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    const session = await form.submit(event, () =>
      auth.resetPassword({ key, password }).catch((error: unknown) => {
        setExpired(isExpiredLink(error))
        throw error
      }),
    )
    if (!session) return
    queryClient.removeQueries({ queryKey: ['auth', 'reset-key'] })
    // Signing in continues on its own page: straight to the second step, or with the new password.
    await navigate({ to: '/login', search: session.status === SessionStatus.anonymous ? { passwordChanged: true } : {} })
  }

  if (usable.isPending)
    return (
      <AuthFrame title={t.reset.setNew}>
        <Skeleton className="h-10" />
      </AuthFrame>
    )

  // A link works once and for a limited time. The backend reports both the same way, as an error about the key.
  if (usable.data === false || expired)
    return (
      <AuthFrame title={t.reset.expired}>
        <Button asChild variant="default" className="max-lg:h-11">
          <Link to="/reset-password">{t.reset.sendNewLink}</Link>
        </Button>
      </AuthFrame>
    )

  return (
    <AuthFrame title={t.reset.setNew}>
      <form noValidate className="space-y-4" onSubmit={(event) => void submit(event)}>
        <FormAlert>{form.message}</FormAlert>
        <Field label={t.newPassword} aside={t.passwordRule} error={form.fields.password}>
          {(field) => <PasswordInput {...field} name="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" autoFocus required minLength={8} />}
        </Field>
        <SubmitButton className={FULL_BUTTON} busy={form.busy}>
          {t.reset.setPassword}
        </SubmitButton>
      </form>
    </AuthFrame>
  )
}
