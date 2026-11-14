import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { organizationsQuery } from '@/api/organizations'
import { Wordmark } from '@/components/mark'
import { AppShell, Main, Notice, SkipLink } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { LAST_ORG_KEY, signOut } from '@/lib/session'

// What someone who is in no organization yet sees around a screen: the way to their profile and out.
export function BareShell({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  async function leave() {
    await signOut(queryClient)
    await navigate({ to: '/login' })
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="flex h-11 shrink-0 items-center gap-1 border-b px-3 md:px-4">
        <Link to="/" aria-label="Faultline" className="mr-auto">
          <Wordmark />
        </Link>
        <Button variant="ghost" size="sm" className="max-lg:h-11" asChild>
          <Link to="/profile">Profile</Link>
        </Button>
        <Button variant="ghost" size="sm" className="max-lg:h-11" onClick={() => void leave()}>
          Sign out
        </Button>
      </header>
      <Main>{children}</Main>
      <Notice />
    </div>
  )
}

// The account screens belong to no organization. They sit in the shell of the one last used,
// and in a bare bar for someone who is not in any organization yet.
export function AccountShell({ children }: { children: ReactNode }) {
  const organizations = useQuery(organizationsQuery).data ?? []
  const last = localStorage.getItem(LAST_ORG_KEY)
  const organization = organizations.find((item) => item.slug === last) ?? organizations[0]
  if (organization) return <AppShell org={organization.slug}>{children}</AppShell>
  return <BareShell>{children}</BareShell>
}
