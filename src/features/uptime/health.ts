import type { Check } from '@/api/monitors'
import { DAY } from '@/lib/time'

// The backend knows only up and down. Slow and flapping are read off the checks it returns.
export const Health = { down: 'down', flapping: 'flapping', slow: 'slow', up: 'up', waiting: 'waiting' } as const
export type Health = (typeof Health)[keyof typeof Health]

// Slow: a typical check passes but takes more than this share of the monitor's timeout.
export const SLOW_SHARE = 0.5
// Flapping: up now, but down at least this many times within the window.
export const FLAPPING_DOWNS = 3
export const FLAPPING_WINDOW = DAY

export type Downtime = { from: number; to: number; reason: number | null; ongoing: boolean }

type StateChange = Pick<Check, 'startCheck' | 'isUp' | 'reason'>

/**
 * Stretches of downtime, newest first, rebuilt from the checks where the monitor changed state
 * (newest first, as the backend lists them). A stretch still open at `now` is ongoing.
 */
export function downtimes(changes: StateChange[], now: number): Downtime[] {
  const found: Downtime[] = []
  let open: Downtime | undefined
  for (const change of [...changes].reverse()) {
    const time = Date.parse(change.startCheck)
    if (!change.isUp && !open) open = { from: time, to: now, reason: change.reason ?? null, ongoing: true }
    else if (change.isUp && open) {
      found.push({ ...open, to: time, ongoing: false })
      open = undefined
    }
  }
  if (open) found.push(open)
  return found.reverse()
}

export const slowOver = (timeout: number | null | undefined) => (timeout ? timeout * 1000 * SLOW_SHARE : undefined)

export const isSlow = (check: Pick<Check, 'isUp' | 'responseTime'>, timeout: number | null | undefined) => {
  const over = slowOver(timeout)
  return check.isUp && over !== undefined && (check.responseTime ?? 0) > over
}

// What one check says: it failed, it passed but slowly, or it passed.
export const checkHealth = (check: Pick<Check, 'isUp' | 'responseTime'>, timeout: number | null | undefined): Health =>
  !check.isUp ? Health.down : isSlow(check, timeout) ? Health.slow : Health.up

// The median response time of the checks that passed.
export function typicalResponse(checks: Pick<Check, 'isUp' | 'responseTime'>[]): number | undefined {
  const times = checks.flatMap((check) => (check.isUp && check.responseTime != null ? [check.responseTime] : [])).sort((a, b) => a - b)
  return times[Math.floor(times.length / 2)]
}

export type HealthReport = {
  health: Health
  downtimes: Downtime[]
  typical?: number
  // Typically slow, whatever the health says first.
  slow: boolean
  // For a flapping monitor: how often it went down in the window, and when the first of those began.
  downs?: number
  since?: number
}

export function healthOf(
  monitor: { isUp: boolean | null; timeout?: number | null },
  checks: Pick<Check, 'isUp' | 'responseTime'>[],
  changes: StateChange[],
  now: number,
): HealthReport {
  const periods = downtimes(changes, now)
  const typical = typicalResponse(checks)
  const slow = typical !== undefined && isSlow({ isUp: true, responseTime: typical }, monitor.timeout)
  const report = { downtimes: periods, typical, slow }
  if (monitor.isUp === null) return { ...report, health: Health.waiting }
  if (!monitor.isUp) return { ...report, health: Health.down }
  const recent = periods.filter((period) => period.from > now - FLAPPING_WINDOW)
  if (recent.length >= FLAPPING_DOWNS) return { ...report, health: Health.flapping, downs: recent.length, since: recent.at(-1)!.from }
  return { ...report, health: slow ? Health.slow : Health.up }
}
