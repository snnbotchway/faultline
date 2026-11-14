import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { NewMonitor } from '@/features/uptime/monitor-routes'
import { UptimeList } from '@/features/uptime/uptime-list'

// The stock address of the new-monitor form; here it is a dialog over the list.
export const Route = createFileRoute('/_app/$org/uptime-monitors/new')({ component: NewMonitorRoute })

function NewMonitorRoute() {
  const { org } = Route.useParams()
  const navigate = useNavigate()
  return (
    <>
      <UptimeList org={org} />
      <NewMonitor
        org={org}
        onClose={() => void navigate({ to: '/$org/uptime-monitors', params: { org } })}
        onCreated={(id) => void navigate({ to: '/$org/uptime-monitors/$monitorId', params: { org, monitorId: String(id) } })}
      />
    </>
  )
}
