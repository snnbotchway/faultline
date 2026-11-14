import { CheckReason, MonitorType, type Check, type Monitor } from '@/api/monitors'
import { clock, dayTime } from '@/features/issues/format'
import { every, responseText, span } from './format'
import { Health, type HealthReport } from './health'

// Each health's name, its text colour, its colour as a bar in a chart of checks, and how a title says it.
export const HEALTH: Record<Health, { label: string; color: string; bar: string; headline: string }> = {
  [Health.down]: { label: 'Down', color: 'text-destructive', bar: 'bg-destructive', headline: 'is down' },
  [Health.flapping]: { label: 'Flapping', color: 'text-trend-spiking', bar: 'bg-trend-spiking', headline: 'is flapping' },
  [Health.slow]: { label: 'Slow', color: 'text-level-warning', bar: 'bg-level-warning', headline: 'is slow' },
  [Health.up]: { label: 'Up', color: 'text-ok', bar: 'bg-foreground/45', headline: 'is up' },
  [Health.waiting]: { label: 'Waiting', color: 'text-muted-foreground', bar: 'bg-muted', headline: 'has not reported yet' },
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

type Described = Pick<Monitor, 'monitorType' | 'lastChange' | 'timeout'> & { checks: Pick<Check, 'reason'>[] }

// Why a monitor that is down is down: the reason its current downtime began.
export const downReason = (monitor: Described, report: HealthReport) => reasonText(monitor, report.downtimes[0]?.ongoing ? report.downtimes[0].reason : monitor.checks[0]?.reason)

// One line on what the health means for this monitor, with when it started.
export function healthLine(monitor: Described, report: HealthReport, now: number): string {
  const since = monitor.lastChange ? span(now - Date.parse(monitor.lastChange)) : ''
  switch (report.health) {
    case Health.waiting:
      return isHeartbeat(monitor) ? `${NO_HEARTBEAT} yet` : 'No check yet'
    case Health.down:
      return `Down ${since} · ${downReason(monitor, report)}`
    case Health.flapping: {
      const first = new Date(report.since!)
      const when = first.toDateString() === new Date(now).toDateString() ? clock(first) : dayTime(first, new Date(now))
      return `Down ${report.downs} times since ${when}`
    }
    case Health.slow:
      return `${responseText(report.typical)} of a ${monitor.timeout}s timeout`
    case Health.up:
      return since ? `Up ${since}` : 'Up'
  }
}

// A monitor id in the address that cannot be one is not found, without asking the backend.
export const isMonitorId = (id: number) => Number.isInteger(id) && id > 0

export const UptimeTab = { monitors: 'monitors', statusPages: 'status-pages' } as const
export type UptimeTab = (typeof UptimeTab)[keyof typeof UptimeTab]

