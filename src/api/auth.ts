import { queryOptions } from '@tanstack/react-query'
import { BACKEND_PATHS } from './backend-paths'
import { ApiError, HttpStatus, allauth, csrfToken, unwrap, type ApiResult } from './client'
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

const AuthFlow = { mfaAuthenticate: 'mfa_authenticate', providerSignup: 'provider_signup' } as const

// Every allauth call answers with the session state; a 401 can still carry a pending step.
export function toSession(response: Response, body: AuthBody | undefined): Session {
  if (response.ok && body?.data?.user) return { status: SessionStatus.authenticated, user: body.data.user }
  if (response.status === HttpStatus.unauthenticated || response.status === HttpStatus.sessionGone) {
    const pending = body?.data?.flows?.find((flow) => flow.is_pending)
    if (pending?.id === AuthFlow.mfaAuthenticate) return { status: SessionStatus.mfaPending, mfaTypes: pending.types ?? [] }
    if (pending?.id === AuthFlow.providerSignup) return { status: SessionStatus.providerSignup }
    return { status: SessionStatus.anonymous }
  }
  throw new ApiError(response.status, body)
}

async function settle(request: Promise<ApiResult<unknown>>) {
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
  queryFn: async () => unwrap(await allauth.GET('/_allauth/browser/v1/config')).data,
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
  // allauth's schema types the credential as an empty object; it is the browser's PublicKeyCredential JSON.
  webauthnAuthenticate: (credential: AuthenticationResponseJSON) =>
    settle(
      allauth.POST('/_allauth/browser/v1/auth/webauthn/authenticate', {
        body: { credential: credential as unknown as Schemas['WebAuthnCredential'] },
      }),
    ),
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
  const token = csrfToken()
  if (!token) throw new Error('Reload the page, then try signing in again.')
  const fields = { provider, process, callback_url: callbackUrl, csrfmiddlewaretoken: token }
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

// Only same-origin paths. The resolved path is checked again because URL normalisation
// turns `/.//host` into `//host`, which a browser reads as another site.
export function safeNext(next: unknown): string | undefined {
  if (typeof next !== 'string' || !next.startsWith('/')) return undefined
  let url: URL
  try {
    url = new URL(next, window.location.origin)
  } catch {
    return undefined
  }
  const path = url.pathname + url.search + url.hash
  if (url.origin !== window.location.origin || /^\/[/\\]/.test(path)) return undefined
  return path
}

// Backend paths are server-rendered (admin, OAuth consent…), so they need a full page load.
export function isBackendPage(path: string) {
  return BACKEND_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))
}
