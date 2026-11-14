import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { SessionStatus, auth, isBackendPage, redirectToProvider, safeNext, sessionQuery, type Session } from '@/api/auth'
import { SignInField, checkCode, checkSignIn, signInProblems, type SignInProblems } from '@/api/sign-in-errors'
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

// A labelled field with its error underneath. `children` gets the ids that tie the input to both.
function Field({ label, error, children }: { label: string; error?: string; children: (ids: { id: string; 'aria-describedby'?: string }) => ReactNode }) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      {children({ id, 'aria-describedby': error ? errorId : undefined })}
      {error && (
        <p id={errorId} className="mt-2 text-sm text-destructive" role="alert">
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
  const [errors, setErrors] = useState<SignInProblems['fields']>({})
  const [message, setMessage] = useState(
    search.socialLoginError ? "That sign-in didn't go through. Try again, or use your email and password." : '',
  )
  const mfa = session?.status === SessionStatus.mfaPending

  function show(form: HTMLFormElement, problems: SignInProblems) {
    setErrors(problems.fields)
    setMessage(problems.message ?? '')
    const first = Object.values(SignInField).find((field) => problems.fields[field])
    const input = first && form.elements.namedItem(first)
    if (input instanceof HTMLElement) input.focus()
  }

  async function submit(event: FormEvent<HTMLFormElement>, found: SignInProblems, request: () => Promise<Session>) {
    event.preventDefault()
    const form = event.currentTarget
    show(form, found)
    if (Object.keys(found.fields).length > 0) return
    setBusy(true)
    try {
      const next = await request()
      queryClient.setQueryData(sessionQuery.queryKey, next)
      // The route's beforeLoad sends a signed-in user on to `next`.
      if (next.status === SessionStatus.authenticated) await router.invalidate()
    } catch (error) {
      show(form, signInProblems(error))
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
        <div className="mt-4 h-px flex-1 -translate-y-1/2 bg-border" />
        <Mark className="-mx-1 size-12" />
        <div className="mt-8 h-px flex-1 -translate-y-1/2 bg-border" />
      </div>
      <div className="mx-auto w-full max-w-94 px-4 pt-7">
        <p className="text-center font-mono text-xs font-semibold tracking-[0.18em]">FAULTLINE</p>
        <h1 className="mt-10 text-2xl font-semibold">{mfa ? 'Two-step verification' : 'Sign in'}</h1>
        {message && (
          <p className="prose-text mt-3 border border-destructive px-3 py-2 text-destructive" role="alert">
            {message}
          </p>
        )}
        {mfa ? (
          <form noValidate className="mt-5 space-y-4" onSubmit={(event) => void submit(event, checkCode(code), () => auth.mfaCode(code.trim()))}>
            <Field label="Authenticator or recovery code" error={errors.code}>
              {(ids) => (
                <Input
                  {...ids}
                  name={SignInField.code}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  autoFocus
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
            <form noValidate className="mt-5 space-y-4" onSubmit={(event) => void submit(event, checkSignIn({ email, password }), () => auth.login({ email: email.trim(), password }))}>
              <Field label="Email" error={errors.email}>
                {(ids) => (
                  <Input
                    {...ids}
                    name={SignInField.email}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    autoFocus
                    aria-invalid={!!errors.email}
                    className="h-10"
                  />
                )}
              </Field>
              <Field label="Password" error={errors.password}>
                {(ids) => (
                  <Input
                    {...ids}
                    name={SignInField.password}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
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
