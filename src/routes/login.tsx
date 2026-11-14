import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { SessionStatus, auth, isBackendPage, redirectToProvider, safeNext, sessionQuery, type Session } from '@/api/auth'
import { fieldErrors, formErrors } from '@/api/client'
import { explain } from '@/api/errors'
import { instanceSettingsQuery } from '@/api/organizations'
import { Mark } from '@/components/mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ANONYMOUS } from '@/lib/session'
import { useTitle } from '@/lib/title'

type LoginSearch = { next?: string; socialLoginError?: boolean }

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    next: typeof search.next === 'string' ? search.next : undefined,
    socialLoginError: search.socialLoginError === true || search.socialLoginError === 'true' || undefined,
  }),
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)
    if (session.status !== SessionStatus.authenticated) return
    const next = safeNext(search.next) ?? '/'
    // Server-rendered pages (admin, OAuth consent) need a real page load.
    if (isBackendPage(next)) window.location.assign(next)
    else throw redirect({ href: next, replace: true })
  },
  component: Login,
})

function Field({ label, error, children }: { label: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {error && (
        <p className="prose-text mt-1.5 text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function Login() {
  useTitle('Sign in')
  const search = Route.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()
  const session = useQuery(sessionQuery).data
  const settings = useQuery(instanceSettingsQuery).data
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState(
    search.socialLoginError ? "That sign-in didn't go through. Try again, or use your email and password." : '',
  )
  const mfa = session?.status === SessionStatus.mfaPending

  async function submit(event: FormEvent, request: () => Promise<Session>) {
    event.preventDefault()
    setBusy(true)
    setErrors({})
    setMessage('')
    try {
      const next = await request()
      queryClient.setQueryData(sessionQuery.queryKey, next)
      // The route's beforeLoad sends a signed-in user on to `next`.
      if (next.status === SessionStatus.authenticated) await router.invalidate()
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(fields)
      if (Object.keys(fields).length === 0) setMessage(formErrors(error)[0] ?? explain(error, 'sign you in'))
    } finally {
      setBusy(false)
    }
  }

  async function startOver() {
    await auth.logout()
    queryClient.setQueryData(sessionQuery.queryKey, ANONYMOUS)
    setCode('')
    setErrors({})
  }

  const callback = `/login${search.next ? `?next=${encodeURIComponent(search.next)}` : ''}`

  return (
    <main className="min-h-dvh pb-16">
      {/* The mark, drawn across the page: one line that slips where the form begins. */}
      <div className="flex items-start pt-[14vh]" aria-hidden>
        <div className="mt-[10px] h-px flex-1 bg-border" />
        <Mark className="-mx-[3px] size-8" />
        <div className="mt-[21px] h-px flex-1 bg-border" />
      </div>
      <div className="mx-auto w-full max-w-[376px] px-4 pt-7">
        <p className="text-center font-mono text-xs font-semibold tracking-[0.18em]">FAULTLINE</p>
        <h1 className="mt-10 text-2xl font-semibold">{mfa ? 'Two-step verification' : 'Sign in'}</h1>
        {message && (
          <p className="prose-text mt-3 border border-destructive px-3 py-2 text-destructive" role="alert">
            {message}
          </p>
        )}
        {mfa ? (
          <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event, () => auth.mfaCode(code.trim()))}>
            <Field label="Authenticator or recovery code" error={errors.code}>
              {(id) => (
                <Input
                  id={id}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  aria-invalid={!!errors.code}
                  className="h-10 font-mono tracking-[0.2em]"
                />
              )}
            </Field>
            <Button type="submit" variant="default" className="h-10 w-full max-lg:h-11" disabled={busy} aria-busy={busy}>
              Verify
            </Button>
            <Button variant="link" onClick={() => void startOver()}>
              Use another account
            </Button>
          </form>
        ) : (
          <>
            <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event, () => auth.login({ email, password }))}>
              <Field label="Email" error={errors.email}>
                {(id) => (
                  <Input
                    id={id}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                    aria-invalid={!!errors.email}
                    className="h-10"
                  />
                )}
              </Field>
              <Field label="Password" error={errors.password}>
                {(id) => (
                  <Input
                    id={id}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    aria-invalid={!!errors.password}
                    className="h-10"
                  />
                )}
              </Field>
              <Button type="submit" variant="default" className="h-10 w-full max-lg:h-11" disabled={busy} aria-busy={busy}>
                Sign in
              </Button>
            </form>
            {settings && settings.socialApps.length > 0 && (
              <div className="mt-6 space-y-2 border-t pt-6">
                {settings.socialApps.map((app) => (
                  <Button key={app.provider} className="h-10 w-full max-lg:h-11" onClick={() => redirectToProvider(app.provider, callback)}>
                    Continue with {app.name}
                  </Button>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-between gap-x-6 gap-y-2">
              <Button variant="link" asChild>
                <Link to="/reset-password">Forgot password?</Link>
              </Button>
              {settings?.enableUserRegistration && (
                <Button variant="link" asChild>
                  <Link to="/register">Create account</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
