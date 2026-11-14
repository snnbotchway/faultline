import { createFileRoute } from '@tanstack/react-router'
import { MonitorPage } from '@/features/uptime/monitor-page'

export const Route = createFileRoute('/_app/$org/uptime-monitors/$monitorId/')({ component: MonitorRoute })

function MonitorRoute() {
  const { org, monitorId: id } = Route.useParams()
  const monitorId = Number(id)
  return <MonitorPage key={monitorId} org={org} monitorId={monitorId} />
}
