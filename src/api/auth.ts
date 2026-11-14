import { queryOptions } from '@tanstack/react-query'
import { ApiError, allauth, csrfToken, unwrap } from './client'
import type { components } from './schema/allauth'

type Schemas = components['schemas']
export type AuthUser = Schemas['User']
export type MfaType = Schemas['AuthenticatorType']

export const SessionStatus = {
  authenticated: 'authenticated',
  mfaPending: 'mfaPending',
  // A social sign-in whose provider gave no email; the user must supply one.
  providerSignup: 'providerSignup',
  anonymous: 'anonymous',
} as const
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus]

export type Session =
  | { status: typeof SessionStatus.authenticated; user: AuthUser }
  | { status: typeof SessionStatus.mfaPending; mfaTypes: MfaType[] }
  | { status: typeof SessionStatus.providerSignup }
  | { status: typeof SessionStatus.anonymous }

type AuthBody = { data?: { user?: AuthUser; flows?: Partial<Schemas['Flow']>[] } }

const UNAUTHENTICATED = 401
const SESSION_GONE = 410

// allauth reports sign-in state through the status code: 200 signed in, 401 not (yet),
// with a pending flow when sign-in needs another step.
export function toSession(response: Response, body: AuthBody | undefined): Session {
  if (response.ok && body?.data?.user) return { status: SessionStatus.authenticated, user: body.data.user }
  if (response.status === UNAUTHENTICATED || response.status === SESSION_GONE) {
    const pending = body?.data?.flows?.find((flow) => flow.is_pending)
    if (pending?.id === 'mfa_authenticate') return { status: SessionStatus.mfaPending, mfaTypes: pending.types ?? [] }
    if (pending?.id === 'provider_signup') return { status: SessionStatus.providerSignup }
    return { status: SessionStatus.anonymous }
  }
  throw new ApiError(response.status, body)
}

async function settle(request: Promise<{ data?: unknown; error?: unknown; response: Response }>) {
  const { data, error, response } = await request
  return toSession(response, (data ?? error) as AuthBody | undefined)
}

export const sessionQuery = queryOptions({
  queryKey: ['auth', 'session'],
  // Also issues the CSRF cookie, which the SPA shell does not.
  queryFn: () => settle(allauth.GET('/_allauth/browser/v1/auth/session')),
  staleTime: Infinity,
})

export const authConfigQuery = queryOptions({
  queryKey: ['auth', 'config'],
  queryFn: async () => (await allauth.GET('/_allauth/browser/v1/config')).data?.data,
  staleTime: Infinity,
})

export const auth = {
  login: (body: { email: string; password: string }) =>
    settle(allauth.POST('/_allauth/browser/v1/auth/login', { body })),
  signup: (body: { email: string; password: string }) =>
    settle(allauth.POST('/_allauth/browser/v1/auth/signup', { body })),
  logout: () => settle(allauth.DELETE('/_allauth/browser/v1/auth/session')),
  mfaCode: (code: string) => settle(allauth.POST('/_allauth/browser/v1/auth/2fa/authenticate', { body: { code } })),
  // Pass the options to navigator.credentials.get(), then send back the credential's toJSON().
  webauthnOptions: async () =>
    unwrap(await allauth.GET('/_allauth/browser/v1/auth/webauthn/authenticate')).data.request_options,
  webauthnAuthenticate: (credential: unknown) =>
    settle(allauth.POST('/_allauth/browser/v1/auth/webauthn/authenticate', { body: { credential } as never })),
  providerSignup: (email: string) =>
    settle(allauth.POST('/_allauth/browser/v1/auth/provider/signup', { body: { email } })),
  requestPasswordReset: async (email: string) => {
    unwrap(await allauth.POST('/_allauth/browser/v1/auth/password/request', { body: { email } }))
  },
  // A 401 here means the password changed and sign-in continues (MFA or login).
  resetPassword: (body: { key: string; password: string }) =>
    settle(allauth.POST('/_allauth/browser/v1/auth/password/reset', { body })),
  verifyEmail: (key: string) => settle(allauth.POST('/_allauth/browser/v1/auth/email/verify', { body: { key } })),
}

export const AuthProcess = { login: 'login', connect: 'connect' } as const
export type AuthProcess = (typeof AuthProcess)[keyof typeof AuthProcess]

// The provider redirect must be a real form POST so the browser follows the IdP redirect.
export function redirectToProvider(provider: string, callbackUrl: string, process: AuthProcess = AuthProcess.login) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = '/_allauth/browser/v1/auth/provider/redirect'
  const fields = { provider, process, callback_url: callbackUrl, csrfmiddlewaretoken: csrfToken() ?? '' }
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.append(input)
  }
  document.body.append(form)
  form.submit()
}

// Only same-origin paths. Resolving through URL also catches `//host`, `/\host` and `/\t/host`.
export function safeNext(next: unknown): string | undefined {
  if (typeof next !== 'string' || !next.startsWith('/')) return undefined
  const url = new URL(next, window.location.origin)
  if (url.origin !== window.location.origin) return undefined
  return url.pathname + url.search + url.hash
}

// Server-rendered backend pages need a full page load after sign-in.
export function isBackendPage(path: string) {
  return /^\/(admin|oauth)\//.test(path)
}
