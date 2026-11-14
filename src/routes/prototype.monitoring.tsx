import { createFileRoute, redirect } from '@tanstack/react-router'

// PROTOTYPE, throwaway: the front door to src/routes/-prototype.monitoring.
export const Route = createFileRoute('/prototype/monitoring')({
  beforeLoad: () => {
    throw redirect({ href: '/demo-co/uptime-monitors?variant=a' })
  },
})
