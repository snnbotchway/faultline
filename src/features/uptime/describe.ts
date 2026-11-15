import { CheckReason, MonitorType, type Check, type Monitor } from '@/api/monitors'
import { clock, dayTime } from '@/features/issues/format'
import { messages, type Messages } from '@/i18n'
import { everyPhrase, span } from './format'
import { Health, type HealthReport } from './health'
import { formatMs } from '@/features/performance/format'

// Each health's text colour and its colour as a bar in a chart of checks. Its words are in the catalog.
export const HEALTH: Record<Health, { color: string; bar: string }> = {
  [Health.down]: { color: 'text-destructive', bar: 'bg-destructive' },
  [Health.flapping]: { color: 'text-trend-spiking', bar: 'bg-trend-spiking' },
  [Health.slow]: { color: 'text-level-warning', bar: 'bg-level-warning' },
  [Health.up]: { color: 'text-ok', bar: 'bg-foreground/45' },
  [Health.waiting]: { color: 'text-muted-foreground', bar: 'bg-muted' },
}

// A health's name (`Down`), as it follows a count (`down`), and how a monitor's title says it (`Checkout is down`).
export const healthLabel = (health: Health) => messages().uptime.health[health].label
export const healthInline = (health: Health) => messages().uptime.health[health].inline
export const healthHeadline = (health: Health, name: string) => messages().uptime.health[health].headline(name)

// Every health in the order monitors are listed: what needs attention first.
export const HEALTH_ORDER: Health[] = [Health.down, Health.flapping, Health.slow, Health.up, Health.waiting]

// The states that need someone's attention.
export const ALARMS: Health[] = [Health.down, Health.flapping, Health.slow]
export const isAlarm = (health: Health) => ALARMS.includes(health)

// Why a check failed, in the user's words. A heartbeat fails only one way.
const REASON: Record<CheckReason, keyof Messages['uptime']['reasons']> = {
  [CheckReason.unknown]: 'unknown',
  [CheckReason.timeout]: 'timeout',
  [CheckReason.status]: 'status',
  [CheckReason.body]: 'body',
  [CheckReason.certificate]: 'certificate',
  [CheckReason.network]: 'network',
}
export const isHeartbeat = (monitor: Pick<Monitor, 'monitorType'>) => monitor.monitorType === MonitorType.heartbeat
export const reasonText = (monitor: Pick<Monitor, 'monitorType'>, reason: number | null | undefined) => {
  const words = messages().uptime
  return isHeartbeat(monitor) ? words.noHeartbeat : words.reasons[REASON[(reason ?? CheckReason.unknown) as CheckReason] ?? REASON[CheckReason.unknown]]
}

// What the monitor checks, without the scheme: `api.example.com/health` (machine text), or for a heartbeat,
// which checks nothing itself, how often one is due: `every hour` (words).
export const targetText = (monitor: Pick<Monitor, 'monitorType' | 'url' | 'interval'>) =>
  isHeartbeat(monitor) ? everyPhrase(monitor.interval) : (monitor.url ?? '').replace(/^https?:\/\//, '')

type Described = Pick<Monitor, 'monitorType' | 'lastChange' | 'timeout'> & { checks: Pick<Check, 'reason'>[] }

// Why a monitor that is down is down: the reason its current downtime began.
export const downReason = (monitor: Described, report: HealthReport) => reasonText(monitor, report.downtimes[0]?.ongoing ? report.downtimes[0].reason : monitor.checks[0]?.reason)

// One line on what the health means for this monitor, with when it started.
export function healthLine(monitor: Described, report: HealthReport, now: number): string {
  const words = messages().uptime
  const since = monitor.lastChange ? span(now - Date.parse(monitor.lastChange)) : ''
  switch (report.health) {
    case Health.waiting:
      return isHeartbeat(monitor) ? words.noHeartbeatYet : words.noCheckYet
    case Health.down:
      return words.downSince(since, downReason(monitor, report))
    case Health.flapping: {
      const first = new Date(report.since!)
      const when = first.toDateString() === new Date(now).toDateString() ? clock(first) : dayTime(first, new Date(now))
      return words.flappingSince(report.downs!, when)
    }
    case Health.slow:
      return words.slowLine(formatMs(report.typical!), monitor.timeout!)
    case Health.up:
      return words.upSince(since)
  }
}
