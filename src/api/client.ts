import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema/openapi'

const CSRF_COOKIE = 'csrftoken'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

const csrf: Middleware = {
  onRequest({ request }) {
    if (SAFE_METHODS.has(request.method)) return
    const token = readCookie(CSRF_COOKIE)
    if (token) request.headers.set('X-CSRFToken', decodeURIComponent(token))
  },
}

export const api = createClient<paths>({ baseUrl: '/', credentials: 'same-origin' })
api.use(csrf)
