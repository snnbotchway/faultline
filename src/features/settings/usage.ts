import type { UsageKind } from '@/api/usage'

export const KIND_LABEL: Record<UsageKind, string> = { errors: 'Errors', transactions: 'Transactions', logs: 'Logs', uptime: 'Uptime checks' }
export const KIND_WORD: Record<UsageKind, [one: string, many: string]> = {
  errors: ['error', 'errors'],
  transactions: ['transaction', 'transactions'],
  logs: ['log', 'logs'],
  uptime: ['uptime check', 'uptime checks'],
}

export const BLOCKED = 100

/**
 * The configured percent of a project's new events to drop, from its organization's rate and its own, as stock
 * shows it. GlitchTip rolls for each rate on its own and drops the event when either roll says so, so the project's
 * share applies to what the organization's leaves: 25% and 10% come to 33% (GlitchTip 7.0.0,
 * `apps/event_ingest/authentication.py:137`). Ingest drops a little more than it is set to, (r+1)/101 for a rate r,
 * which this leaves out. Either rate at 100 drops everything. A partial rate never rounds to nothing or to everything.
 */
export function effectiveDropRate(organization: number, project: number): number {
  const rates = [organization, project].map((rate) => Math.min(BLOCKED, Math.max(0, rate)))
  if (rates.includes(BLOCKED)) return BLOCKED
  // In whole hundredths of a percent, so 25 and 10 come to 32.5 exactly and round up.
  const kept = rates.reduce((share, rate) => share * (BLOCKED - rate), 1)
  const all = BLOCKED ** rates.length
  if (kept === all) return 0
  return Math.min(BLOCKED - 1, Math.max(1, Math.round((all - kept) / BLOCKED)))
}

// An organization that is not accepting events rejects every one, whatever its rate (`authentication.py:245`).
export const organizationDropRate = (organization: { eventThrottleRate?: number | null; isAcceptingEvents: boolean }) =>
  organization.isAcceptingEvents ? (organization.eventThrottleRate ?? 0) : BLOCKED

// The lowest and highest share dropped across an organization's projects; the organization's own without projects.
export function dropRange(organization: number, projects: number[]): { min: number; max: number } {
  const rates = projects.length ? projects.map((project) => effectiveDropRate(organization, project)) : [effectiveDropRate(organization, 0)]
  return { min: Math.min(...rates), max: Math.max(...rates) }
}

// `25%`, or `25–33%` when projects differ.
export const rangeText = ({ min, max }: { min: number; max: number }) => (min === max ? `${max}%` : `${min}–${max}%`)

export function dayAt(x: number, left: number, width: number, count: number): number {
  if (width <= 0 || count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.floor(((x - left) / width) * count)))
}

export function stepDay(current: number | undefined, step: -1 | 1, count: number): number {
  if (current === undefined) return step < 0 ? count - 1 : 0
  return Math.min(count - 1, Math.max(0, current + step))
}

const countFormat = new Intl.NumberFormat('en')
// `4,810`: an exact count.
export const exactCount = (count: number) => countFormat.format(count)

// A part of a whole as a whole percent; a part too small to round to one still shows.
export function share(part: number, whole: number): string {
  if (whole <= 0 || part <= 0) return '0%'
  const percent = Math.round((part / whole) * 100)
  return percent < 1 ? '<1%' : `${percent}%`
}
