import { createFileRoute } from '@tanstack/react-router'
import { StatsPeriod } from '@/api/issues'
import { UptimeList } from '@/features/uptime/uptime-list'

// `?period=14d` widens the shared time axis from the last day to the last two weeks.
const validateSearch = (search: Record<string, unknown>): { period?: StatsPeriod } => (search.period === StatsPeriod.fortnight ? { period: StatsPeriod.fortnight } : {})

export const Route = createFileRoute('/_app/$org/uptime-monitors/')({ validateSearch, component: UptimeRoute })

function UptimeRoute() {
  return <UptimeList org={Route.useParams().org} period={Route.useSearch().period} />
}
