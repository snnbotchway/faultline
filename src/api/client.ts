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
  if (value === undefined) return undefined
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// Read the cookie on every request: login rotates the token.
export function csrfToken(): string | undefined {
  return readCookie(CSRF_COOKIE)
}

const csrf: Middleware = {
  onRequest({ request }) {
    const token = csrfToken()
    if (token && !SAFE_METHODS.has(request.method)) request.headers.set('X-CSRFToken', token)
  },
}

// Set once by the app shell.
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

type AllauthError = { message?: string; param?: string }

// GlitchTip answers {detail}, allauth answers {errors: [{message, param}]}.
function allauthErrors(body: unknown): AllauthError[] {
  return body && typeof body === 'object' && 'errors' in body && Array.isArray(body.errors) ? body.errors : []
}

function errorMessage(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') return body.detail
  return allauthErrors(body)[0]?.message
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {}
  return Object.fromEntries(
    allauthErrors(error.body).flatMap((e) => (e.param && e.message ? [[e.param, e.message]] : [])),
  )
}

export const orgPath = (slug: string) => ({ organization_id_or_slug: slug })

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
