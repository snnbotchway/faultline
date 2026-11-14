// PROTOTYPE, throwaway. Stub data in the backend's own shapes (src/api/schema/openapi.d.ts),
// generated around "now" so the screens always show a live-looking day.
//
// What the real API can supply for each piece (GlitchTip 7.0.0):
// - `checks` on a monitor: the newest 60 only. The list has no response times; the detail has them.
// - `changes`: GET monitors/{id}/checks/?is_change=true, one request per monitor. Uptime % and
//   down periods over 24 hours or 14 days come from these; the API has no uptime figure.
// - release `issues`: an issue search for `release:<version>`, one request per release.
import type { components } from '@/api/schema/openapi'

type Schemas = components['schemas']
export type Check = Schemas['MonitorCheckResponseTimeSchema']
export type Monitor = Schemas['MonitorDetailSchema'] & { changes: Check[] }
export type Alert = Schemas['ProjectAlertSchema'] & { project: string }
export type Recipient = Schemas['AlertRecipientSchema']
export type Release = Schemas['ReleaseSchema']
export type Deploy = Schemas['DeploySchema']
export type Commit = Schemas['CommitSchema']
export type StatusPage = Omit<Schemas['StatusPageSchema'], 'monitors'> & { monitors: number[] }
export type ReleaseFile = { id: number; name: string; size: number; dateCreated: string }
export type ReleaseIssue = { id: string; shortId: string; level: string; type: string; value: string; count: number; lastSeen: string; firstSeenHere: boolean }

export const MonitorType = { get: 'GET', post: 'POST', ping: 'Ping', port: 'TCP Port', heartbeat: 'Heartbeat' } as const
export type MonitorType = (typeof MonitorType)[keyof typeof MonitorType]

// apps/uptime/constants.py MonitorCheckReason, in the user's words.
export const REASONS: Record<number, string> = { 0: 'No answer', 1: 'Timed out', 2: 'Wrong status', 3: 'Text not found', 4: 'Certificate problem', 5: "Couldn't connect" }

export const RecipientType = {
  email: 'email',
  webhook: 'webhook',
  slack: 'slack',
  discord: 'discord',
  teams: 'teams',
  googlechat: 'googlechat',
  ntfy: 'ntfy',
  feishu: 'feishu',
  zulip: 'zulip',
} as const
export type RecipientType = (typeof RecipientType)[keyof typeof RecipientType]

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
export const NOW = Math.floor(Date.now() / MIN) * MIN
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString()

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Outage = { ago: number; lasts?: number; reason: number }
type Spec = {
  id: number
  name: string
  type: MonitorType
  url: string
  interval: number
  timeout: number | null
  status?: number
  body?: string
  project: string | null
  env?: string
  base: number
  spread: number
  spikes?: number
  outages: Outage[]
  never?: boolean
}

const SPECS: Spec[] = [
  {
    id: 3, name: 'Checkout API', type: MonitorType.get, url: 'https://api.demo.example/checkout/health', interval: 60, timeout: 5, status: 200,
    project: 'payments-api', env: 'production', base: 140, spread: 60,
    outages: [{ ago: 14 * MIN, reason: 2 }, { ago: 3 * DAY + 2 * HOUR, lasts: 41 * MIN, reason: 2 }, { ago: 9 * DAY, lasts: 8 * MIN, reason: 1 }],
  },
  {
    id: 6, name: 'Search', type: MonitorType.get, url: 'https://demo.example/search?q=ping', interval: 60, timeout: 5, status: 200, body: 'results',
    project: 'web-app', env: 'production', base: 2100, spread: 1300, spikes: 0.12,
    outages: [
      { ago: 38 * MIN, lasts: 3 * MIN, reason: 1 }, { ago: 2 * HOUR + 10 * MIN, lasts: 4 * MIN, reason: 1 }, { ago: 4 * HOUR + 30 * MIN, lasts: 2 * MIN, reason: 1 },
      { ago: 7 * HOUR, lasts: 3 * MIN, reason: 1 }, { ago: 29 * HOUR, lasts: 9 * MIN, reason: 1 },
      { ago: 4 * DAY, lasts: 12 * MIN, reason: 1 }, { ago: 6 * DAY + 5 * HOUR, lasts: 5 * MIN, reason: 1 }, { ago: 11 * DAY, lasts: 17 * MIN, reason: 1 },
    ],
  },
  {
    id: 2, name: 'Sign-in page', type: MonitorType.get, url: 'https://demo.example/login', interval: 60, timeout: 10, status: 200, body: 'Sign in',
    project: 'web-app', env: 'production', base: 210, spread: 80, outages: [{ ago: 3 * DAY + 4 * HOUR, lasts: 22 * MIN, reason: 5 }],
  },
  { id: 1, name: 'Marketing site', type: MonitorType.get, url: 'https://demo.example/', interval: 300, timeout: 20, status: 200, project: 'web-app', base: 82, spread: 30, outages: [] },
  {
    id: 4, name: 'Payment webhook', type: MonitorType.post, url: 'https://api.demo.example/hooks/momo', interval: 300, timeout: 10, status: 204,
    project: 'payments-api', env: 'production', base: 320, spread: 120, outages: [{ ago: 6 * DAY, lasts: 72 * MIN, reason: 4 }],
  },
  { id: 5, name: 'Database port', type: MonitorType.port, url: 'db.demo.example:5432', interval: 120, timeout: 5, project: null, base: 12, spread: 6, outages: [] },
  { id: 7, name: 'Edge node', type: MonitorType.ping, url: 'edge-1.demo.example', interval: 60, timeout: 5, project: null, base: 24, spread: 10, outages: [{ ago: 12 * DAY, lasts: 3 * MIN, reason: 5 }] },
  {
    id: 8, name: 'Nightly export', type: MonitorType.heartbeat, url: '', interval: 86400, timeout: null, project: 'payments-api', base: 0, spread: 0,
    outages: [{ ago: 5 * DAY, lasts: 3 * HOUR, reason: 0 }],
  },
  { id: 9, name: 'Weekly report', type: MonitorType.heartbeat, url: '', interval: 604800, timeout: null, project: 'web-app', base: 0, spread: 0, outages: [], never: true },
]

const PROJECT_IDS: Record<string, string> = { 'web-app': '1', 'payments-api': '2', mobile: '3' }

function build(spec: Spec): Monitor {
  const rand = random(spec.id * 7919)
  const downAt = (ago: number) => spec.outages.find((o) => ago <= o.ago && (o.lasts === undefined || ago > o.ago - o.lasts))
  const checks: Check[] = spec.never
    ? []
    : Array.from({ length: 60 }, (_, index) => {
        const ago = index * spec.interval * 1000
        const outage = downAt(ago)
        const spike = spec.spikes && rand() < spec.spikes ? spec.base * (0.8 + rand()) : 0
        const limit = (spec.timeout ?? 20) * 1000
        const time = outage?.reason === 1 ? limit : Math.min(Math.round(spec.base + rand() * spec.spread + spike), limit * 0.96)
        return { startCheck: iso(ago), isUp: !outage, reason: outage ? outage.reason : null, responseTime: spec.type === MonitorType.heartbeat ? null : time }
      })
  const changes: Check[] = spec.outages
    .flatMap((o) => [
      { startCheck: iso(o.ago), isUp: false, reason: o.reason, responseTime: null },
      ...(o.lasts === undefined ? [] : [{ startCheck: iso(o.ago - o.lasts), isUp: true, reason: null, responseTime: null }]),
    ])
    .sort((a, b) => b.startCheck.localeCompare(a.startCheck))
  const endpoint = `f8f15ab1-c266-4d61-b9de-6a17cd3cf${String(spec.id).padStart(3, '0')}`
  return {
    id: spec.id,
    name: spec.name,
    monitorType: spec.type,
    url: spec.url,
    interval: spec.interval,
    timeout: spec.timeout,
    expectedStatus: spec.status ?? null,
    expectedBody: spec.body ?? '',
    confirmationThreshold: 1,
    projectID: spec.project ? (PROJECT_IDS[spec.project] ?? null) : null,
    projectName: spec.project,
    environmentID: spec.env ? 1 : null,
    envName: spec.env ?? null,
    organizationID: 1,
    created: iso(40 * DAY),
    isUp: spec.never ? null : !downAt(0),
    lastChange: spec.never ? null : (changes[0]?.startCheck ?? iso(40 * DAY)),
    heartbeatEndpoint: spec.type === MonitorType.heartbeat ? `https://faultline.demo.example/api/0/organizations/demo-co/heartbeat_check/${endpoint}/` : null,
    endpointID: spec.type === MonitorType.heartbeat ? endpoint : null,
    checks,
    changes,
  }
}

export const MONITORS: Monitor[] = SPECS.map(build)
export const monitorById = (id: number) => MONITORS.find((monitor) => monitor.id === id)

export const State = { down: 'down', up: 'up', waiting: 'waiting' } as const
export type State = (typeof State)[keyof typeof State]
export const stateOf = (monitor: Pick<Monitor, 'isUp'>): State => (monitor.isUp === null ? State.waiting : monitor.isUp ? State.up : State.down)
const STATE_ORDER = [State.down, State.up, State.waiting]
export const downFirst = (monitors: Monitor[]) => [...monitors].sort((a, b) => STATE_ORDER.indexOf(stateOf(a)) - STATE_ORDER.indexOf(stateOf(b)))

export const Period = { day: '24h', fortnight: '14d' } as const
export type Period = (typeof Period)[keyof typeof Period]
export type Span = { from: number; to: number }
export const spanFor = (period: Period): Span => ({ from: NOW - (period === Period.day ? DAY : 14 * DAY), to: NOW })

export type Outline = { from: number; to: number; reason: number; ongoing: boolean }

// Down periods rebuilt from the state-change checks, newest first.
export function incidents(monitor: Monitor): Outline[] {
  const oldestFirst = [...monitor.changes].reverse()
  const found: Outline[] = []
  oldestFirst.forEach((change, index) => {
    if (change.isUp) return
    const recovery = oldestFirst.slice(index + 1).find((later) => later.isUp)
    found.push({ from: Date.parse(change.startCheck), to: recovery ? Date.parse(recovery.startCheck) : NOW, reason: change.reason ?? 0, ongoing: !recovery })
  })
  return found.reverse()
}

export function uptime(monitor: Monitor, span: Span): number | undefined {
  if (monitor.isUp === null) return undefined
  const down = incidents(monitor).reduce((sum, o) => sum + Math.max(0, Math.min(o.to, span.to) - Math.max(o.from, span.from)), 0)
  return 1 - down / (span.to - span.from)
}

export function responseNow(monitor: Monitor): number | undefined {
  const times = monitor.checks.filter((check) => check.isUp && check.responseTime != null).map((check) => check.responseTime as number)
  if (!times.length) return undefined
  return [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)]
}

// The backend has no "slow" or "flapping" state; these are read off the checks it does return.
// Slow: a check that passed but took more than half of the monitor's timeout.
const SLOW_SHARE = 0.5
export const slowOver = (monitor: Pick<Monitor, 'timeout'>) => (monitor.timeout ? monitor.timeout * 1000 * SLOW_SHARE : undefined)
export function isSlow(check: Check, monitor: Pick<Monitor, 'timeout'>): boolean {
  const over = slowOver(monitor)
  return check.isUp && over !== undefined && (check.responseTime ?? 0) > over
}

// Flapping: up now, but it went down at least this many times in the last 24 hours.
const FLAPPING_FROM = 3
export function flapping(monitor: Monitor): { count: number; since: number } | undefined {
  if (!monitor.isUp) return undefined
  const recent = incidents(monitor).filter((outage) => outage.from > NOW - DAY)
  return recent.length >= FLAPPING_FROM ? { count: recent.length, since: recent.at(-1)!.from } : undefined
}

export const Health = { down: 'down', flapping: 'flapping', slow: 'slow', up: 'up', waiting: 'waiting' } as const
export type Health = (typeof Health)[keyof typeof Health]
export function healthOf(monitor: Monitor): Health {
  if (monitor.isUp === null) return Health.waiting
  if (!monitor.isUp) return Health.down
  if (flapping(monitor)) return Health.flapping
  const typical = responseNow(monitor)
  const over = slowOver(monitor)
  return typical !== undefined && over !== undefined && typical > over ? Health.slow : Health.up
}

export const PROJECTS = ['web-app', 'payments-api', 'mobile']
export const ENVIRONMENTS = ['production', 'staging']

export const RELEASES: Release[] = [
  { version: '1.5.1', ago: 5 * HOUR, projects: ['payments-api'], commits: 3, deploys: 1 },
  { version: '1.5.0', ago: 2 * DAY, projects: ['web-app', 'payments-api', 'mobile'], commits: 14, deploys: 2 },
  { version: 'payments-api@2026.11.07+build.418', ago: 4 * DAY + 3 * HOUR, projects: ['payments-api'], commits: 0, deploys: 0 },
  { version: '1.4.1', ago: 6 * DAY, projects: ['web-app', 'mobile'], commits: 5, deploys: 1 },
  { version: '1.4.0', ago: 12 * DAY, projects: ['web-app', 'payments-api', 'mobile'], commits: 22, deploys: 2 },
].map((r) => ({
  version: r.version,
  shortVersion: r.version,
  ref: null,
  dateCreated: iso(r.ago),
  dateReleased: r.deploys ? iso(r.ago - 20 * MIN) : null,
  projects: r.projects.map((slug) => ({ name: slug, slug })),
  repository: null,
  url: null,
  data: {},
  commitCount: r.commits,
  deployCount: r.deploys,
}))
export const releaseByVersion = (version: string) => RELEASES.find((release) => release.version === version)

const ISSUE_POOL: Omit<ReleaseIssue, 'lastSeen' | 'firstSeenHere'>[] = [
  { id: '115', shortId: 'PAYMENTS-API-2', level: 'error', type: 'TimeoutError', value: 'Mobile money gateway did not respond within 30s', count: 77 },
  { id: '121', shortId: 'PAYMENTS-API-7', level: 'fatal', type: 'IntegrityError', value: 'duplicate key value violates unique constraint "payments_reference_key"', count: 12 },
  { id: '108', shortId: 'WEB-APP-4', level: 'error', type: 'TypeError', value: "Cannot read properties of undefined (reading 'premium')", count: 431 },
  { id: '109', shortId: 'WEB-APP-5', level: 'warning', type: 'ChunkLoadError', value: 'Loading chunk 482 failed', count: 58 },
  { id: '131', shortId: 'MOBILE-3', level: 'error', type: 'NetworkError', value: 'Request failed with status 502', count: 203 },
  { id: '133', shortId: 'MOBILE-5', level: 'info', type: 'Deprecation', value: 'AsyncStorage has been extracted from react-native core', count: 9 },
]
const RELEASE_ISSUES: Record<string, [number, boolean, number][]> = {
  '1.5.1': [[1, true, 22 * MIN], [0, false, 3 * MIN]],
  '1.5.0': [[2, true, 40 * MIN], [0, true, 3 * MIN], [4, false, 2 * HOUR], [3, true, 9 * HOUR]],
  '1.4.1': [[4, true, 2 * HOUR], [5, true, 3 * DAY]],
  '1.4.0': [[3, false, 9 * HOUR]],
}
export const releaseIssues = (version: string): ReleaseIssue[] =>
  (RELEASE_ISSUES[version] ?? []).map(([index, firstSeenHere, ago]) => ({ ...ISSUE_POOL[index]!, firstSeenHere, lastSeen: iso(ago) }))

const AUTHORS = ['Ama Owusu', 'Kofi Mensah', 'Efua Asante']
const MESSAGES = [
  'Retry mobile money charges on gateway timeout',
  'Fix premium lookup for lapsed policies',
  'Bump payments client to 4.2',
  'Add idempotency key to charge requests',
  'Split the checkout bundle',
  'Handle 502 from the quote service',
  'Move policy search to the new index',
]
export function releaseCommits(release: Release): Commit[] {
  const rand = random(release.version.length * 131)
  const created = NOW - Date.parse(release.dateCreated)
  return Array.from({ length: Math.min(release.commitCount, 7) }, (_, index) => ({
    id: Array.from({ length: 40 }, () => Math.floor(rand() * 16).toString(16)).join(''),
    message: MESSAGES[(index + release.version.length) % MESSAGES.length]!,
    authorName: AUTHORS[index % AUTHORS.length]!,
    authorEmail: null,
    dateCreated: iso(created + (index + 1) * 3 * HOUR),
  }))
}
export function releaseDeploys(release: Release): Deploy[] {
  const created = NOW - Date.parse(release.dateCreated)
  return Array.from({ length: release.deployCount }, (_, index) => ({
    id: index + 1,
    environment: index === 0 ? 'production' : 'staging',
    url: index === 0 ? 'https://demo.example' : 'https://staging.demo.example',
    dateCreated: iso(created - (index === 0 ? 20 : -90) * MIN),
    dateStarted: null,
    dateFinished: iso(created - (index === 0 ? 20 : -90) * MIN),
  }))
}
export function releaseFiles(release: Release): ReleaseFile[] {
  if (!release.deployCount) return []
  const names = ['~/assets/index-B7x2kQ.js', '~/assets/index-B7x2kQ.js.map', '~/assets/checkout-Dq91Lm.js', '~/assets/checkout-Dq91Lm.js.map', '~/assets/vendor-9aKs02.js.map']
  return names.map((name, index) => ({ id: index + 1, name, size: name.endsWith('.map') ? 1_840_000 + index * 310_000 : 212_000 + index * 40_000, dateCreated: release.dateCreated }))
}

// Events per day across the organization for the last 14 days, oldest first.
export const ORG_EVENTS = [212, 188, 240, 610, 480, 300, 262, 244, 530, 410, 298, 270, 742, 388]

let recipientId = 0
const to = (recipientType: RecipientType, url = ''): Recipient => ({ id: ++recipientId, recipientType, url, config: {}, tagsToAdd: [] })
export const ALERTS: Alert[] = [
  {
    id: 1, project: 'web-app', name: 'Error burst', quantity: 10, timespanMinutes: 5, uptime: false, environments: [],
    alertRecipients: [to(RecipientType.email), to(RecipientType.slack, 'https://hooks.slack.example/services/T02AB/B91/web-oncall')],
  },
  { id: 2, project: 'web-app', name: 'Downtime', quantity: null, timespanMinutes: null, uptime: true, environments: [], alertRecipients: [to(RecipientType.discord, 'https://discord.example/api/webhooks/7731/ops')] },
  {
    id: 3, project: 'payments-api', name: 'Any payment error', quantity: 1, timespanMinutes: 1, uptime: false, environments: ['production'],
    alertRecipients: [to(RecipientType.email), to(RecipientType.teams, 'https://demo.webhook.office.example/webhookb2/4c1f/payments'), to(RecipientType.ntfy, 'https://ntfy.example/payments-oncall')],
  },
  {
    id: 4, project: 'payments-api', name: 'Downtime and spikes', quantity: 50, timespanMinutes: 10, uptime: true, environments: ['production'],
    alertRecipients: [to(RecipientType.email), to(RecipientType.googlechat, 'https://chat.example/v1/spaces/AAAA/messages?key=ops')],
  },
]

export const STATUS_PAGES: StatusPage[] = [
  { name: 'Demo Co status', slug: 'demo-co-status', isPublic: true, monitors: [3, 2, 1, 6] },
  { name: 'Payments partners', slug: 'payments-partners', isPublic: false, monitors: [3, 4] },
  { name: 'Internal tools', slug: 'internal-tools', isPublic: false, monitors: [] },
]
