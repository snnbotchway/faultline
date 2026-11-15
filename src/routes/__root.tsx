import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { useT } from '@/i18n'
import { useTitle } from '@/lib/title'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: Failed,
})

function NotFound() {
  const t = useT()
  useTitle(t.common.notFound)
  return (
    <div className="flex min-h-dvh">
      <Screen title={t.common.pageNotFound}>
        <Button asChild>
          <Link to="/">{t.common.goToIssues}</Link>
        </Button>
      </Screen>
    </div>
  )
}

function Failed({ error }: ErrorComponentProps) {
  const router = useRouter()
  const t = useT()
  useEffect(() => console.error(error), [error])
  return (
    <div className="flex min-h-dvh">
      <Screen title={t.common.pageFailed}>
        <Button onClick={() => void router.invalidate()}>{t.common.tryAgain}</Button>
      </Screen>
    </div>
  )
}
