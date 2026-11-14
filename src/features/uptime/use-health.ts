import { useQueries } from '@tanstack/react-query'
import { monitorChangesQuery, monitorQuery, type Check, type Monitor } from '@/api/monitors'
import { healthOf, type HealthReport } from './health'

export type MonitorHealth = { report: HealthReport; checks: Check[]; loaded: boolean }

/**
 * Health for each monitor in a list. The list leaves out response times and state changes, so each
 * monitor is fetched once more for them, and again only when it has a newer check or changed state.
 * Until both answers are in, a monitor is judged on what the list says.
 */
export function useMonitorHealth(org: string, monitors: Monitor[], now: number): Map<number, MonitorHealth> {
  const details = useQueries({ queries: monitors.map((monitor) => monitorQuery(org, monitor.id, monitor.checks[0]?.startCheck ?? 'none')) })
  const changes = useQueries({ queries: monitors.map((monitor) => monitorChangesQuery(org, monitor.id, monitor.lastChange)) })
  return new Map(
    monitors.map((monitor, index) => {
      const detail = details[index]
      const changed = changes[index]
      const checks = detail?.data?.checks ?? monitor.checks
      const loaded = !detail?.isPending && !changed?.isPending
      return [monitor.id, { report: healthOf(monitor, checks, changed?.data ?? [], now), checks, loaded }]
    }),
  )
}
