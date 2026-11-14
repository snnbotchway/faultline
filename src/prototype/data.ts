// THROWAWAY PROTOTYPE DATA. Real GlitchTip responses from dev/fixtures, plus the
// few fields the seeded backend cannot give us, synthesised below and marked SYNTHETIC.
import eventLatest from '../../dev/fixtures/event-latest.json'
import eventsRaw from '../../dev/fixtures/events.json'
import statsRaw from '../../dev/fixtures/issues-stats.json'
import issuesRaw from '../../dev/fixtures/issues.json'
import membersRaw from '../../dev/fixtures/members.json'
import projectsRaw from '../../dev/fixtures/projects.json'
import tagsRaw from '../../dev/fixtures/tags.json'

/** Fixed "now" so relative times and screenshots are stable. */
export const NOW = new Date('2026-11-14T11:42:00Z').getTime()
const MIN = 60_000
const HOUR = 60 * MIN
export const DAY = 24 * HOUR
export const DAYS = 14

export type Level = 'error' | 'warning' | 'info'
export type Status = 'unresolved' | 'resolved' | 'ignored'
export type Trend = 'new' | 'spiking' | 'ongoing'

export type Issue = {
  id: string
  shortId: string
  type: string
  value: string
  filename: string
  fn: string
  level: Level
  count: number
  users: number
  project: string
  platform: string
  firstRelease: string
  lastRelease: string
  firstSeen: number
  lastSeen: number
  /** events per day, oldest first, 14 buckets */
  d14: number[]
  /** events per hour, oldest first, 24 buckets */
  h24: number[]
  trend: Trend
}

// SYNTHETIC: the seed posts every event in the same second and GlitchTip buckets
// stats by arrival time, so the real stats are a single bar and every issue was
// "seen" at the same instant. Each issue gets a plausible shape: weights over 14
// days (oldest first) and how long ago it was last seen. Totals still equal the
// real event count. Issue 1 uses the real event timestamps from events.json.
const SHAPES: Record<string, { w: number[]; last: number; trend: Trend }> = {
  '6': { w: [0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 2, 3, 7, 13], last: 2 * MIN, trend: 'spiking' },
  '1': { w: [], last: 7 * MIN, trend: 'spiking' },
  '9': { w: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12], last: 19 * MIN, trend: 'new' },
  '5': { w: [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1], last: 48 * MIN, trend: 'ongoing' },
  '2': { w: [0, 0, 0, 0, 0, 0, 0, 4, 2, 1, 0, 1, 0, 1], last: 2.2 * HOUR, trend: 'ongoing' },
  '7': { w: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4], last: 5 * HOUR, trend: 'new' },
  '3': { w: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], last: 11 * HOUR, trend: 'ongoing' },
  '10': { w: [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], last: 26 * HOUR, trend: 'ongoing' },
  '4': { w: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0], last: 3.1 * DAY, trend: 'ongoing' },
  '8': { w: [0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0], last: 5.4 * DAY, trend: 'ongoing' },
}

function fit(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  const out = weights.map((w) => Math.floor((w / sum) * total))
  let left = total - out.reduce((a, b) => a + b, 0)
  for (let i = out.length - 1; left > 0; i = (i - 1 + out.length) % out.length) {
    if ((weights[i] ?? 0) > 0) {
      out[i] = (out[i] ?? 0) + 1
      left--
    }
  }
  return out
}

/** Issue 1's daily series, from the real `date_created` of its fixture events. */
function realDaily(total: number): number[] {
  const out = Array.from({ length: DAYS }, () => 0)
  for (const e of eventsRaw) {
    const age = Math.floor((NOW - new Date(e.date_created).getTime()) / DAY)
    const i = DAYS - 1 - age
    if (i >= 0 && i < DAYS) out[i] = (out[i] ?? 0) + 1
  }
  // events.json holds one page (20 of 24); the remaining arrivals are today's.
  out[DAYS - 1] = (out[DAYS - 1] ?? 0) + Math.max(0, total - out.reduce((a, b) => a + b, 0))
  return out
}

function hourly(today: number, lastAgo: number, seed: number): number[] {
  const out = Array.from({ length: 24 }, () => 0)
  const lastIdx = 23 - Math.min(23, Math.floor(lastAgo / HOUR))
  for (let n = 0; n < today; n++) {
    const back = n === 0 ? 0 : (n * 3 + seed * 5 + n * n) % (lastIdx + 1)
    const i = Math.max(0, lastIdx - Math.floor(back / (1 + (n % 3))))
    out[i] = (out[i] ?? 0) + 1
  }
  return out
}

const userCounts = new Map(statsRaw.map((s) => [s.id, s.userCount]))

export const ISSUES: Issue[] = issuesRaw.map((raw) => {
  const shape = SHAPES[raw.id] ?? { w: [1], last: DAY, trend: 'ongoing' as Trend }
  const count = Number(raw.count)
  const d14 = raw.id === '1' ? realDaily(count) : fit(shape.w, count)
  const firstIdx = Math.max(0, d14.findIndex((v) => v > 0))
  const lastSeen = NOW - shape.last
  const firstSeen = Math.min(lastSeen - 3 * MIN, NOW - (DAYS - firstIdx) * DAY + 7 * HOUR)
  return {
    id: raw.id,
    shortId: raw.shortId,
    type: raw.metadata.type,
    value: raw.metadata.value,
    filename: raw.metadata.filename,
    fn: raw.metadata.function,
    level: raw.level as Level,
    count,
    users: userCounts.get(raw.id) ?? raw.userCount,
    project: raw.project.slug,
    platform: raw.project.platform,
    firstRelease: raw.firstRelease.shortVersion,
    lastRelease: raw.lastRelease.shortVersion,
    firstSeen,
    lastSeen,
    d14,
    h24: shape.last < DAY ? hourly(d14[DAYS - 1] ?? 0, shape.last, Number(raw.id)) : Array.from({ length: 24 }, () => 0),
    trend: shape.trend,
  }
})

// SYNTHETIC: the seeded releases were all created in the same second.
export const RELEASES = [
  { version: '1.4.0', at: NOW - 12.4 * DAY },
  { version: '1.4.1', at: NOW - 6.6 * DAY },
  { version: '1.5.0', at: NOW - 1.3 * DAY },
]

export const ORG = 'Demo Co'
export const ME = membersRaw[0]?.email ?? 'demo@example.com'
export const PROJECTS = projectsRaw.map((p) => ({ slug: p.slug, platform: p.platform })).reverse()
export const ENVIRONMENTS = ['production', 'staging']

export type Frame = {
  filename: string
  fn: string
  line: number
  inApp: boolean
  context: [number, string][]
}
export type Crumb = { category: string; message: string; level: string; at: number; status?: number }

export type EventDetail = {
  id: string
  at: number
  frames: Frame[] // most recent call first
  crumbs: Crumb[]
  request: { method: string; url: string }
  user: { id: string; email: string; ip: string }
  contexts: { label: string; value: string }[]
  tags: { key: string; value: string }[]
  json: string
}

type RawFrame = { filename: string; function: string; lineNo: number; inApp: boolean; context: (string | number)[][] }

export const EVENT_COUNT = eventsRaw.length

/**
 * The latest-event fixture belongs to WEB-APP-1. For any other issue the same
 * event is re-labelled with that issue's exception and top frame (SYNTHETIC) and
 * loses its source context, which would be for the wrong file.
 */
export function eventFor(issue: Issue, index = 0): EventDetail {
  const own = issue.id === '1'
  const exception = eventLatest.entries.find((e) => e.type === 'exception')
  const crumbs = eventLatest.entries.find((e) => e.type === 'breadcrumbs')
  const request = eventLatest.entries.find((e) => e.type === 'request')
  const rawFrames = ((exception?.data as { values?: { stacktrace: { frames: RawFrame[] } }[] }).values?.[0]?.stacktrace
    .frames ?? []) as RawFrame[]
  const frames: Frame[] = rawFrames
    .map((f, i) => {
      const top = i === rawFrames.length - 1
      return {
        filename: !own && top ? issue.filename : f.filename,
        fn: !own && top ? issue.fn : f.function,
        line: f.lineNo,
        inApp: f.inApp,
        context: own ? (f.context as [number, string][]) : [],
      }
    })
    .reverse()
  const at = index === 0 ? issue.lastSeen : (EVENTS[index]?.at ?? issue.firstSeen)
  const rawCrumbs = ((crumbs?.data as { values?: unknown[] }).values ?? []) as {
    category: string
    message: string | null
    level: string
    timestamp: string
    data: { url: string; method: string; status_code: number } | null
  }[]
  const crash = new Date(eventLatest.dateReceived).getTime()
  const req = request?.data as { method: string; url: string }
  return {
    id: index === 0 ? eventLatest.eventID : (EVENTS[index]?.id ?? eventLatest.eventID),
    at,
    frames,
    crumbs: rawCrumbs.map((c) => ({
      category: c.category,
      message: c.message ?? `${c.data?.method} ${c.data?.url}`,
      level: c.level,
      status: c.data?.status_code,
      at: at - (crash - new Date(c.timestamp).getTime()),
    })),
    request: { method: req.method, url: own ? req.url : req.url.replace('web-app/renderQuote', `${issue.project}/${issue.fn}`) },
    user: { id: eventLatest.user.id, email: eventLatest.user.email, ip: eventLatest.user.ip_address },
    contexts: [
      { label: 'Browser', value: eventLatest.contexts.browser.name },
      { label: 'OS', value: eventLatest.contexts.os.name },
    ],
    tags: eventLatest.tags.filter((t) => !t.key.startsWith('user.') && t.key !== 'browser'),
    json: JSON.stringify(eventLatest, null, 2),
  }
}

export type Facet = { key: string; total: number; unique: number; top: { value: string; count: number }[] }
/** Tag facets, most useful first. High-cardinality keys keep only their count. */
export const FACETS: Facet[] = ['release', 'environment', 'browser.name', 'os.name', 'user.email']
  .map((key) => tagsRaw.find((t) => t.key === key))
  .filter((t) => t !== undefined)
  .map((t) => ({
    key: t.key,
    total: t.totalValues,
    unique: t.uniqueValues,
    top: t.uniqueValues > 6 ? [] : t.topValues.map((v) => ({ value: v.value, count: v.count })),
  }))

export function ago(t: number): string {
  const d = NOW - t
  if (d < HOUR) return `${Math.max(1, Math.round(d / MIN))}m`
  if (d < DAY) return `${Math.round(d / HOUR)}h`
  return `${Math.round(d / DAY)}d`
}

export function clock(t: number): string {
  return new Date(t).toISOString().slice(11, 19)
}

export function dayLabel(t: number): string {
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function stamp(t: number): string {
  return `${dayLabel(t)}, ${new Date(t).toISOString().slice(11, 16)} UTC`
}

const tagOf = (e: (typeof eventsRaw)[number], key: string) => e.tags.find((t) => t.key === key)?.value ?? ''
/** WEB-APP-1's events page, newest first (index matches `eventFor`). */
export const EVENTS = eventsRaw
  .map((e) => ({
    id: e.event_id,
    at: new Date(e.date_created).getTime(),
    user: e.user?.email ?? '',
    release: tagOf(e, 'release'),
    environment: tagOf(e, 'environment'),
    browser: tagOf(e, 'browser.name'),
  }))
  .sort((a, b) => b.at - a.at)

export const MEMBERS = membersRaw.map((m) => ({ email: m.email, role: m.roleName, joined: new Date(m.dateCreated).getTime() }))
export const PROJECT_DETAILS = projectsRaw.map((p) => ({
  id: p.id,
  slug: p.slug,
  platform: p.platform,
  scrubIp: p.scrubIPAddresses,
  throttle: p.eventThrottleRate,
  teams: p.teams.map((t) => t.slug),
  created: new Date(p.dateCreated).getTime(),
  // SYNTHETIC: client keys are not in the fixtures.
  dsn: `https://4f1c9a7e2b5d4c38a6e0d1b7c9f2a3e${p.id}@faultline.example.com/${p.id}`,
}))
