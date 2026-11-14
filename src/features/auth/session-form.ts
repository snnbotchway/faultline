import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { redirect, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { SessionStatus, auth, isBackendPage, redirectToProvider, safeNext, sessionQuery, type Session } from '@/api/auth'
import { formProblems, type FormProblems } from '@/api/form-errors'
import { checkForm, fieldNames, focusFirstProblem, hasProblems } from '@/lib/form-check'
import { ANONYMOUS } from '@/lib/session'

// Something the sign-in page should say when another screen sends the person to it.
export const LoginNotice = { socialFailed: 'socialFailed', passwordChanged: 'passwordChanged' } as const
export type LoginNotice = (typeof LoginNotice)[keyof typeof LoginNotice]

export type AuthSearch = { next?: string }

export const authSearch = (search: Record<string, unknown>): AuthSearch => ({
  next: typeof search.next === 'string' ? search.next : undefined,
})

// A signed-out screen has nothing for someone who is signed in: send them on to `next`, or home.
// Server-rendered pages (admin, OAuth consent) need a real page load.
export async function sendSignedInOn(queryClient: QueryClient, next: string | undefined) {
  const session = await queryClient.ensureQueryData(sessionQuery)
  if (session.status !== SessionStatus.authenticated) return
  const target = safeNext(next) ?? '/'
  if (isBackendPage(target)) window.location.assign(target)
  else throw redirect({ href: target, replace: true })
}

// The social sign-in callback, which carries `next` through the provider and back.
export const providerCallback = (next: string | undefined) => `/login/finalize${next ? `?next=${encodeURIComponent(next)}` : ''}`

export function continueWithProvider(provider: string, next: string | undefined) {
  redirectToProvider(provider, providerCallback(next))
}

/**
 * Runs one step of signing in and keeps the session in step with the backend's answer. `found` is what the form
 * caught before sending; `explainFailure` words the backend's refusal. Problems go under their fields, focus moves
 * to the first one, and anything else becomes `message`.
 */
export function useSessionForm(explainFailure: (error: unknown, shown: readonly string[]) => FormProblems) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [problems, setProblems] = useState<FormProblems>({ fields: {} })

  function show(form: HTMLFormElement | null, found: FormProblems) {
    setProblems(found)
    focusFirstProblem(form, found)
  }

  async function run(request: () => Promise<Session>, form: HTMLFormElement | null = null): Promise<Session | undefined> {
    setBusy(true)
    show(form, { fields: {} })
    try {
      const session = await request()
      queryClient.setQueryData(sessionQuery.queryKey, session)
      return session
    } catch (error) {
      show(form, explainFailure(error, form ? fieldNames(form) : []))
      return undefined
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>, request: () => Promise<Session>, found?: FormProblems): Promise<Session | undefined> {
    event.preventDefault()
    const form = event.currentTarget
    const caught = found ?? checkForm(form)
    if (!hasProblems(caught)) return run(request, form)
    show(form, caught)
    return undefined
  }

  // Lets the route's guard send a signed-in person on to `next`.
  const proceed = (session: Session | undefined) => (session?.status === SessionStatus.authenticated ? router.invalidate() : undefined)

  async function startOver() {
    await auth.logout()
    queryClient.setQueryData(sessionQuery.queryKey, ANONYMOUS)
    setProblems({ fields: {} })
  }

  return { busy, errors: problems.fields, message: problems.message, clearMessage: () => setProblems({ fields: {} }), run, submit, proceed, startOver }
}

// Words a failed step that is not the password or code check, which use `signInProblems`.
export const formFailure = (action: string) => (error: unknown, shown: readonly string[]) => formProblems(error, action, shown)
