// Seeds a GlitchTip backend with a demo user, org, projects and sample events,
// using only the public API so it keeps working across backend versions.
// The one exception is backdating the events so they span two weeks (dev/backdate.py),
// which runs inside the local compose backend. Skip it for any other backend with
// --no-backdate or SEED_BACKDATE=0; every issue then shows as new.
// Usage: bun dev/seed.ts [backendUrl] [--no-backdate]
import { join } from 'node:path'
import { ERRORS, RELEASES, eventTimes, makeEvent, titleOf } from './sample-events.ts'

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

// The step that needs the local compose backend; see dev/backdate.py for what it does and why.
async function backdateEvents(now: number) {
  const root = join(import.meta.dir, '..')
  const releases = Object.fromEntries(RELEASES.map((release) => [release.version, new Date(now - release.daysAgo * 24 * 3_600_000).toISOString()]))
  const script = await Bun.file(join(root, 'dev/backdate.py')).text()
  const run = Bun.spawn(
    ['docker', 'compose', '-f', 'dev/compose.yml', 'exec', '-T', '-e', `SEED_ORG=${DEMO.org}`, '-e', `SEED_RELEASES=${JSON.stringify(releases)}`, 'web', './manage.py', 'shell', '-c', script],
    { cwd: root, stdout: 'inherit', stderr: 'inherit' },
  )
  if ((await run.exited) !== 0) throw new Error('Backdating the seeded events failed. Set SEED_BACKDATE=0 to seed a backend that is not the local compose.')
}

// `backdate` spreads the events over two weeks; it only works against the local compose backend.
export async function seed(base: string, backdate = process.env.SEED_BACKDATE !== '0') {
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
  const issues = () => s.ok('GET', `/api/0/organizations/${o}/issues/?query=&limit=100`) as Promise<{ id: string; title: string; status: string; count: string }[]>
  if ((await issues()).length === 0) {
    const now = Date.now()
    const store = async (slug: string, error: (typeof ERRORS)[string][number], i: number, at: number) => {
      const { id, key } = keys[slug]!
      const res = await fetch(`${base}/api/${id}/store/`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-sentry-auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=faultline-seed/1.0`,
        },
        body: JSON.stringify(makeEvent(slug, error, i, at, now)),
      })
      if (!res.ok) throw new Error(`store ${slug} → ${res.status} ${await res.text()}`)
    }
    const all = Object.entries(ERRORS).flatMap(([slug, errors]) => errors.map((error) => ({ slug, error, times: eventTimes(error, now) })))
    // Each issue's first event goes in alone and in order, so short ids come out the same on every run.
    for (const { slug, error, times } of all) {
      await store(slug, error, 0, times[0]!)
      for (let tries = 0; !(await issues()).some((issue) => issue.title === titleOf(error)); tries++) {
        if (tries > 120) throw new Error('The backend did not process a seeded event.')
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
    await Promise.all(
      all.map(async ({ slug, error, times }) => {
        for (const [i, at] of times.entries()) if (i > 0) await store(slug, error, i, at)
      }),
    )
    // Events are processed after the request returns; the backdate step needs all of them stored.
    const sent = Object.values(ERRORS).flat().reduce((sum, error) => sum + eventTimes(error, now).length, 0)
    const stored = async () => (await issues()).reduce((sum, issue) => sum + Number(issue.count), 0)
    for (let tries = 0; (await stored()) < sent; tries++) {
      if (tries > 120) throw new Error('The backend did not finish processing the seeded events.')
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    if (backdate) await backdateEvents(now)
  }
  const seeded = await issues()
  for (const error of Object.values(ERRORS).flat()) {
    const issue = seeded.find((item) => item.title === titleOf(error))
    if (error.status && issue && issue.status === 'unresolved') await s.ok('PUT', `/api/0/organizations/${o}/issues/?id=${issue.id}`, { status: error.status })
  }
  return keys
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const base = args.find((arg) => !arg.startsWith('--')) ?? 'http://localhost:8600'
  const keys = await seed(base, args.includes('--no-backdate') ? false : undefined)
  console.log(JSON.stringify({ base, user: DEMO.email, org: DEMO.org, keys }, null, 2))
}
