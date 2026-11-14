import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { MonitorPage } from '@/features/uptime/monitor-page'
import { EditMonitor } from '@/features/uptime/monitor-routes'

// The stock address of the edit form; here it is a dialog over the monitor's page.
export const Route = createFileRoute('/_app/$org/uptime-monitors/$monitorId/update')({ component: EditMonitorRoute })

function EditMonitorRoute() {
  const { org, monitorId: id } = Route.useParams()
  const monitorId = Number(id)
  const navigate = useNavigate()
  return (
    <>
      <MonitorPage key={monitorId} org={org} monitorId={monitorId} />
      <EditMonitor org={org} monitorId={monitorId} onClose={() => void navigate({ to: '/$org/uptime-monitors/$monitorId', params: { org, monitorId: id } })} />
    </>
  )
}
