import { createFileRoute } from '@tanstack/react-router'
import { StatusPages } from '@/features/uptime/status-pages'

export const Route = createFileRoute('/_app/$org/uptime-monitors/status-pages')({ component: StatusPagesRoute })

function StatusPagesRoute() {
  return <StatusPages org={Route.useParams().org} />
}
