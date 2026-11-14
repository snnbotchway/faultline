import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { useTitle } from '@/lib/title'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: Failed,
})

function NotFound() {
  useTitle('Not found')
  return (
    <div className="flex min-h-dvh">
      <Screen title="Page not found">
        <Button asChild>
          <Link to="/">Go to issues</Link>
        </Button>
      </Screen>
    </div>
  )
}

function Failed({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <div className="flex min-h-dvh">
      <Screen title="This page didn't load">
        <p className="prose-text text-muted-foreground">{error instanceof Error ? error.message : ''}</p>
        <Button onClick={() => void router.invalidate()}>Try again</Button>
      </Screen>
    </div>
  )
}
