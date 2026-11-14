// PROTOTYPE, throwaway. Adds a few uptime monitors, alert rules, a status page and
// release commits/deploys to the seeded demo org, through the public API only.
// Usage: bun dev/prototype-monitoring-seed.ts [backendUrl]
const base = process.argv[2] ?? 'http://localhost:8600'
const ORG = 'demo-co'
const cookies = new Map<string, string>()

async function call(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {
    cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
    origin: base,
    referer: `${base}/`,
  }
  const csrf = cookies.get('csrftoken')
  if (csrf) headers['x-csrftoken'] = csrf
  if (body !== undefined) headers['content-type'] = 'application/json'
  const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  for (const line of res.headers.getSetCookie()) {
    const [pair] = line.split(';')
    const eq = pair!.indexOf('=')
    cookies.set(pair!.slice(0, eq), pair!.slice(eq + 1))
  }
  const text = await res.text()
  let data: unknown = text
  try {
    data = text ? JSON.parse(text) : null
  } catch {}
  if (res.status >= 400) console.error(`${method} ${path} → ${res.status}`, JSON.stringify(data).slice(0, 400))
  return { status: res.status, data: data as any }
}

await call('GET', '/_allauth/browser/v1/config')
await call('POST', '/_allauth/browser/v1/auth/login', { email: 'demo@example.com', password: 'demo-pass-123' })

const monitors = `/api/0/organizations/${ORG}/monitors/`
const existing: { name: string }[] = (await call('GET', monitors)).data
const MONITORS = [
  // The backend refuses private or internal targets (and hosts without a dot), so these point at public hosts.
  { name: 'Marketing site', monitorType: 'GET', url: 'https://example.com/', expectedStatus: 200, expectedBody: 'Example Domain', interval: 300, timeout: 20, project: 'web-app' },
  { name: 'Checkout API', monitorType: 'GET', url: 'https://example.com/api/checkout/health', expectedStatus: 200, expectedBody: '', interval: 300, timeout: 5, project: 'payments-api' },
  { name: 'Docs', monitorType: 'GET', url: 'https://example.org/', expectedStatus: 200, expectedBody: '', interval: 300, timeout: 10, project: 'web-app' },
  { name: 'Edge TLS port', monitorType: 'TCP Port', url: 'example.com:443', expectedStatus: null, expectedBody: '', interval: 300, timeout: 5, project: null },
  { name: 'Nightly export', monitorType: 'Heartbeat', url: '', expectedStatus: null, expectedBody: '', interval: 3600, timeout: null, project: 'payments-api' },
]
const projects: { id: string; slug: string }[] = (await call('GET', `/api/0/organizations/${ORG}/projects/`)).data
for (const monitor of MONITORS) {
  if (existing.some((m) => m.name === monitor.name)) continue
  const project = projects.find((p) => p.slug === monitor.project)?.id ?? null
  const made = await call('POST', monitors, { ...monitor, project, confirmationThreshold: 1 })
  console.log('monitor', made.status, monitor.name, made.data?.id, made.data?.heartbeatEndpoint ?? '')
}

for (const slug of ['web-app', 'payments-api']) {
  const path = `/api/0/projects/${ORG}/${slug}/alerts/`
  const have: unknown[] = (await call('GET', path)).data
  if (have.length) continue
  const first = await call('POST', path, {
    name: 'Error burst',
    timespanMinutes: 5,
    quantity: 10,
    uptime: false,
    alertRecipients: [
      { recipientType: 'email', url: '' },
      { recipientType: 'webhook', url: 'https://hooks.example.com/services/T000/B000/demo' },
    ],
  })
  const second = await call('POST', path, {
    name: 'Downtime',
    timespanMinutes: null,
    quantity: null,
    uptime: true,
    alertRecipients: [{ recipientType: 'discord', url: 'https://discord.com/api/webhooks/1/demo' }],
  })
  console.log('alerts', slug, first.status, second.status)
}

const pages = `/api/0/organizations/${ORG}/status-pages/`
const havePages: { name: string }[] = (await call('GET', pages)).data
if (!havePages.some((p) => p.name === 'Demo Co status')) {
  const page = await call('POST', pages, { name: 'Demo Co status', isPublic: true })
  console.log('status page', page.status, JSON.stringify(page.data))
}

const deploys = `/api/0/organizations/${ORG}/releases/1.5.0/deploys/`
if (!(await call('GET', deploys)).data.length) {
  const deploy = await call('POST', deploys, { environment: 'production', url: 'https://demo.example.com' })
  console.log('deploy', deploy.status)
}
