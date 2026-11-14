// Seeds a GlitchTip backend with a demo user, org, projects and sample events,
// using only the public API so it keeps working across backend versions.
// Usage: bun dev/seed.ts [backendUrl]
import { ERRORS, makeEvent } from './sample-events.ts'

export const DEMO = {
  email: 'demo@example.com',
  password: 'demo-pass-123',
  org: 'demo-co',
  team: 'core',
  projects: [
    { slug: 'web-app', platform: 'javascript-react' },
    { slug: 'payments-api', platform: 'python-django' },
    { slug: 'mobile', platform: 'react-native' },
  ],
} as const

class Session {
  private cookies = new Map<string, string>()
  private base: string
  constructor(base: string) {
    this.base = base
  }

  async request(method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = {
      cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
      origin: this.base,
      referer: `${this.base}/`,
    }
    const csrf = this.cookies.get('csrftoken')
    if (csrf) headers['x-csrftoken'] = csrf
    if (body !== undefined) headers['content-type'] = 'application/json'
    const res = await fetch(this.base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(';')
      const eq = pair!.indexOf('=')
      this.cookies.set(pair!.slice(0, eq), pair!.slice(eq + 1))
    }
    const text = await res.text()
    return { status: res.status, data: text ? JSON.parse(text) : null }
  }

  async ok(method: string, path: string, body?: unknown) {
    const res = await this.request(method, path, body)
    if (res.status >= 400) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(res.data)}`)
    return res.data
  }
}

async function signIn(s: Session) {
  await s.request('GET', '/_allauth/browser/v1/config')
  const creds = { email: DEMO.email, password: DEMO.password }
  const login = await s.request('POST', '/_allauth/browser/v1/auth/login', creds)
  if (login.status === 200) return
  await s.ok('POST', '/_allauth/browser/v1/auth/signup', creds)
}

async function ensure<T>(list: () => Promise<T[]>, match: (t: T) => boolean, create: () => Promise<unknown>) {
  if (!(await list()).some(match)) await create()
}

export async function seed(base: string) {
  const s = new Session(base)
  await signIn(s)
  const o = DEMO.org
  await ensure(
    () => s.ok('GET', '/api/0/organizations/'),
    (org: { slug: string }) => org.slug === o,
    () => s.ok('POST', '/api/0/organizations/', { name: 'Demo Co' }),
  )
  await ensure(
    () => s.ok('GET', `/api/0/organizations/${o}/teams/`),
    (t: { slug: string }) => t.slug === DEMO.team,
    () => s.ok('POST', `/api/0/organizations/${o}/teams/`, { slug: DEMO.team }),
  )
  const keys: Record<string, { id: number; key: string }> = {}
  for (const p of DEMO.projects) {
    await ensure(
      () => s.ok('GET', `/api/0/organizations/${o}/projects/`),
      (x: { slug: string }) => x.slug === p.slug,
      () => s.ok('POST', `/api/0/teams/${o}/${DEMO.team}/projects/`, { name: p.slug, platform: p.platform }),
    )
    const project = await s.ok('GET', `/api/0/projects/${o}/${p.slug}/`)
    const [key] = await s.ok('GET', `/api/0/projects/${o}/${p.slug}/keys/`)
    keys[p.slug] = { id: Number(project.id), key: key.public }
  }
  const existing = await s.ok('GET', `/api/0/organizations/${o}/issues/?limit=1`)
  if (existing.length === 0) {
    for (const [slug, errors] of Object.entries(ERRORS)) {
      const { id, key } = keys[slug]!
      for (const error of errors) {
        for (let i = 0; i < error.count; i++) {
          const res = await fetch(`${base}/api/${id}/store/`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-sentry-auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=faultline-seed/1.0`,
            },
            body: JSON.stringify(makeEvent(slug, error, i)),
          })
          if (!res.ok) throw new Error(`store ${slug} → ${res.status} ${await res.text()}`)
        }
      }
    }
  }
  return keys
}

if (import.meta.main) {
  const base = process.argv[2] ?? 'http://localhost:8600'
  const keys = await seed(base)
  console.log(JSON.stringify({ base, user: DEMO.email, org: DEMO.org, keys }, null, 2))
}
