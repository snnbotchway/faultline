import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BASE_PATH } from './api/base'
import { setSignedOutHandler } from './api/client'
import './index.css'
import { forgetSession } from './lib/session'
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000 } } })
const router = createRouter({ routeTree, context: { queryClient }, defaultPreload: 'intent', basepath: BASE_PATH || '/' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// The session ended on the server (expired, or signed out elsewhere): send the user back through sign-in.
setSignedOutHandler(() => {
  const { pathname, href } = router.state.location
  if (pathname === '/login') return
  forgetSession(queryClient)
  void router.navigate({ to: '/login', search: { next: href } })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
