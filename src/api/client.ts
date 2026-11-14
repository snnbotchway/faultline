import createClient, { type Middleware } from 'openapi-fetch'
import { BASE_PATH } from './base'
import type { components as AllauthComponents, paths as AllauthPaths } from './schema/allauth'
import type { paths } from './schema/openapi'

type AllauthSchemas = AllauthComponents['schemas']

export const HttpStatus = { unauthenticated: 401, forbidden: 403, notFound: 404, sessionGone: 410, tooManyRequests: 429 } as const

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
export function setSignedOutHandler(callback: () => void) {
  onSignedOut = callback
}

// The request never got an answer: offline, DNS, a dropped connection.
export class NetworkError extends Error {}

const unreachable: Middleware = {
  onError: () => new NetworkError("Couldn't reach the server."),
}

const signedOut: Middleware = {
  onResponse({ response }) {
    if (response.status === HttpStatus.unauthenticated) onSignedOut()
  },
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  constructor(status: number, body: unknown) {
    super(errorMessage(body) ?? 'Something went wrong. Try again.')
    this.status = status
    this.body = body
  }
}

// The backend answered the request with this status.
export const hasStatus = (error: unknown, status: number) => error instanceof ApiError && error.status === status

// Retries a failed read a few times, but not one the backend says does not exist: that answer will not change.
const RETRIES = 3
export const retryUnlessMissing = (failures: number, error: unknown) => !hasStatus(error, HttpStatus.notFound) && failures < RETRIES

type AllauthError = { message?: string; param?: string }

// GlitchTip answers {detail}, allauth answers {errors: [{message, param}]}.
function allauthErrors(body: unknown): AllauthError[] {
  return body && typeof body === 'object' && 'errors' in body && Array.isArray(body.errors) ? body.errors : []
}

function errorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  if ('detail' in body && typeof body.detail === 'string') return body.detail
  if ('message' in body && typeof body.message === 'string') return body.message
  return allauthErrors(body)[0]?.message
}

export const orgPath = (slug: string) => ({ organization_id_or_slug: slug })

export type ApiResult<T> = { data?: T; error?: unknown; response: Response }

export function unwrap<T>({ data, error, response }: ApiResult<T>): T {
  if (!response.ok) throw new ApiError(response.status, error)
  return data as T
}

export const api = createClient<paths>({ baseUrl: BASE_PATH, credentials: 'same-origin' })
api.use(csrf, signedOut, unreachable)

const allauthClient = (...middleware: Middleware[]) => {
  const client = createClient<AllauthPaths>({ baseUrl: BASE_PATH, credentials: 'same-origin' })
  client.use(csrf, ...middleware, unreachable)
  return client
}

// allauth's own 401s describe sign-in state, so they skip the signed-out handler.
export const allauth = allauthClient()

type AllauthAuthResponse = Pick<AllauthSchemas['AuthenticationResponse'] | AllauthSchemas['ReauthenticationResponse'], 'meta'>

// On allauth's account endpoints a 401 means the session ended, unless it asks a signed-in user to reauthenticate.
const accountSignedOut: Middleware = {
  async onResponse({ response }) {
    if (response.status !== HttpStatus.unauthenticated) return
    const body: AllauthAuthResponse | undefined = await response
      .clone()
      .json()
      .catch(() => undefined)
    if (body?.meta?.is_authenticated !== true) onSignedOut()
  },
}

// For the signed-in account's own settings (password, authenticators, linked accounts), never for signing in.
export const allauthAccount = allauthClient(accountSignedOut)
