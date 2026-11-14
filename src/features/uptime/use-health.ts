import { useQueries, useQueryClient } from '@tanstack/react-query'
import { monitorChangesQuery, monitorKeys, monitorQuery, newestData, type ChangeHistory, type Check, type Monitor, type MonitorDetail } from '@/api/monitors'
import { healthOf, type HealthReport } from './health'

export type MonitorHealth = { report: HealthReport; checks: Check[]; loaded: boolean }

/**
 * Health for each monitor in a list. The list leaves out response times and state changes, so each
 * monitor is fetched once more for them, and again only when it has a newer check or changed state.
 * A monitor is `loaded` once both answers are first in; while a newer one is on its way, it keeps
 * the answer it had, the newest in the cache. State changes are fetched back `window` milliseconds.
 */
export function useMonitorHealth(org: string, monitors: Monitor[], now: number, window: number): Map<number, MonitorHealth> {
  const client = useQueryClient()
  const details = useQueries({
    queries: monitors.map((monitor) => ({
      ...monitorQuery(org, monitor.id, monitor.checks[0]?.startCheck ?? 'none'),
      placeholderData: () => newestData<MonitorDetail>(client, monitorKeys.monitor(org, monitor.id)),
    })),
  })
  const changes = useQueries({
    queries: monitors.map((monitor) => ({
      ...monitorChangesQuery(org, monitor.id, monitor.lastChange, window),
      placeholderData: () => newestData<ChangeHistory>(client, monitorKeys.changes(org, monitor.id)),
    })),
  })
  return new Map(
    monitors.map((monitor, index) => {
      const detail = details[index]?.data
      const changed = changes[index]?.data?.changes
      const checks = detail?.checks ?? monitor.checks
      return [monitor.id, { report: healthOf(monitor, checks, changed ?? [], now), checks, loaded: detail !== undefined && changed !== undefined }]
    }),
  )
}
