import createClient, { type Middleware } from 'openapi-fetch'
import type { paths as AllauthPaths } from './schema/allauth'
import type { paths } from './schema/openapi'

const CSRF_COOKIE = 'csrftoken'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function readCookie(name: string): string | undefined {
  const value = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
  return value === undefined ? undefined : decodeURIComponent(value)
}

// Read the cookie on every request: login rotates the token.
export function csrfToken(): string {
  return readCookie(CSRF_COOKIE) ?? ''
}

const csrf: Middleware = {
  onRequest({ request }) {
    if (!SAFE_METHODS.has(request.method)) request.headers.set('X-CSRFToken', csrfToken())
  },
}

let onSignedOut = () => {}
export function handleSignedOut(callback: () => void) {
  onSignedOut = callback
}

const signedOut: Middleware = {
  onResponse({ response }) {
    if (response.status === 401) onSignedOut()
  },
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  constructor(status: number, body: unknown) {
    super(errorMessage(body) ?? `Request failed (${status})`)
    this.status = status
    this.body = body
  }
}

// GlitchTip answers {detail}, allauth answers {errors: [{message, param}]}.
function errorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  if ('detail' in body && typeof body.detail === 'string') return body.detail
  if ('errors' in body && Array.isArray(body.errors)) return body.errors[0]?.message
  return undefined
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.body || typeof error.body !== 'object') return {}
  const errors = 'errors' in error.body && Array.isArray(error.body.errors) ? error.body.errors : []
  return Object.fromEntries(
    errors
      .filter((e): e is { param: string; message: string } => typeof e?.param === 'string')
      .map((e) => [e.param, e.message]),
  )
}

type Result<T> = { data?: T; error?: unknown; response: Response }

export function unwrap<T>({ data, error, response }: Result<T>): T {
  if (!response.ok) throw new ApiError(response.status, error)
  return data as T
}

export const api = createClient<paths>({ baseUrl: '/', credentials: 'same-origin' })
api.use(csrf, signedOut)

// allauth's own 401s describe sign-in state, so they skip the signed-out handler.
export const allauth = createClient<AllauthPaths>({ baseUrl: '/', credentials: 'same-origin' })
allauth.use(csrf)
