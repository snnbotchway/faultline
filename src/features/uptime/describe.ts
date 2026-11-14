import { CheckReason, MonitorType, type Check, type Monitor } from '@/api/monitors'
import { clockTime, dayTime, every, responseText, span } from './format'
import { Health, type HealthReport } from './health'

export const HEALTH: Record<Health, { label: string; color: string; headline: string }> = {
  [Health.down]: { label: 'Down', color: 'text-destructive', headline: 'is down' },
  [Health.flapping]: { label: 'Flapping', color: 'text-trend-spiking', headline: 'is flapping' },
  [Health.slow]: { label: 'Slow', color: 'text-level-warning', headline: 'is slow' },
  [Health.up]: { label: 'Up', color: 'text-ok', headline: 'is up' },
  [Health.waiting]: { label: 'Waiting', color: 'text-muted-foreground', headline: 'has not reported yet' },
}

// The states that need someone's attention, in the order they are listed.
export const ALARMS: Health[] = [Health.down, Health.flapping, Health.slow]
export const isAlarm = (health: Health) => ALARMS.includes(health)

// Why a check failed, in the user's words. A heartbeat fails only one way.
const REASON: Record<CheckReason, string> = {
  [CheckReason.unknown]: 'No answer',
  [CheckReason.timeout]: 'Timed out',
  [CheckReason.status]: 'Wrong status',
  [CheckReason.body]: 'Text not found',
  [CheckReason.certificate]: 'Certificate problem',
  [CheckReason.network]: "Couldn't connect",
}
export const NO_HEARTBEAT = 'No heartbeat'
export const isHeartbeat = (monitor: Pick<Monitor, 'monitorType'>) => monitor.monitorType === MonitorType.heartbeat
export const reasonText = (monitor: Pick<Monitor, 'monitorType'>, reason: number | null | undefined) =>
  isHeartbeat(monitor) ? NO_HEARTBEAT : (REASON[(reason ?? CheckReason.unknown) as CheckReason] ?? REASON[CheckReason.unknown])

// What the monitor checks, without the scheme: `api.example.com/health`, or `a heartbeat every hour`.
export const targetText = (monitor: Pick<Monitor, 'monitorType' | 'url' | 'interval'>) =>
  isHeartbeat(monitor) ? `a heartbeat every ${every(monitor.interval)}` : (monitor.url ?? '').replace(/^https?:\/\//, '')

// One line on what the health means for this monitor, with when it started.
export function healthLine(monitor: Pick<Monitor, 'monitorType' | 'lastChange' | 'timeout'> & { checks: Pick<Check, 'reason'>[] }, report: HealthReport, now: number): string {
  const since = monitor.lastChange ? span(now - Date.parse(monitor.lastChange)) : ''
  switch (report.health) {
    case Health.waiting:
      return isHeartbeat(monitor) ? `${NO_HEARTBEAT} yet` : 'No check yet'
    case Health.down:
      return `Down ${since} · ${reasonText(monitor, report.downtimes[0]?.ongoing ? report.downtimes[0].reason : monitor.checks[0]?.reason)}`
    case Health.flapping: {
      const first = report.since!
      const when = new Date(first).toDateString() === new Date(now).toDateString() ? clockTime(first) : dayTime(first, now)
      return `Down ${report.downs} times since ${when}`
    }
    case Health.slow:
      return `${responseText(report.typical)} of a ${monitor.timeout}s timeout`
    case Health.up:
      return since ? `Up ${since}` : 'Up'
  }
}

export const CRUMB_LINK = 'shrink-0 text-muted-foreground hover:text-foreground max-lg:py-3'

export const UptimeTab = { monitors: 'monitors', statusPages: 'status-pages' } as const
export type UptimeTab = (typeof UptimeTab)[keyof typeof UptimeTab]

