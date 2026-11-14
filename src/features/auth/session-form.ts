import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { redirect, useRouter } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { SessionStatus, auth, isBackendPage, redirectToProvider, safeNext, sessionQuery, type Session } from '@/api/auth'
import { withBase } from '@/api/base'
import { useFormRequest } from '@/lib/use-form-request'
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
  if (isBackendPage(target)) window.location.assign(withBase(target))
  else throw redirect({ href: target, replace: true })
}

// The social sign-in callback, which carries `next` through the provider and back.
export const providerCallback = (next: string | undefined) => `/login/finalize${next ? `?next=${encodeURIComponent(next)}` : ''}`

export function continueWithProvider(provider: string, next: string | undefined) {
  redirectToProvider(provider, providerCallback(next))
}

/**
 * Runs one step of signing in and keeps the session in step with the backend's answer. `action` completes
 * "Couldn't …". Problems go under their fields, focus moves to the first one, and anything else becomes `message`.
 */
export function useSessionForm(action: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const form = useFormRequest(action)

  async function remember(request: () => Promise<Session>) {
    const session = await request()
    queryClient.setQueryData(sessionQuery.queryKey, session)
    return session
  }

  const run = async (request: () => Promise<Session>) => (await form.send(() => remember(request)))?.value
  const submit = async (event: FormEvent<HTMLFormElement>, request: () => Promise<Session>) => (await form.submit(event, () => remember(request)))?.value

  // Lets the route's guard send a signed-in person on to `next`.
  const proceed = (session: Session | undefined) => (session?.status === SessionStatus.authenticated ? router.invalidate() : undefined)

  // The backend has no sign-in in progress any more; show the first step.
  function forget() {
    queryClient.setQueryData(sessionQuery.queryKey, ANONYMOUS)
    form.clear()
  }

  async function startOver() {
    await auth.logout()
    forget()
  }

  return { busy: form.busy, fields: form.fields, message: form.message, clear: form.clear, run, submit, proceed, forget, startOver }
}
