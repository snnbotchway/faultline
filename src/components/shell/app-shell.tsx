import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronsUpDown, Ellipsis, LogOut, Monitor, Moon, Search, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { SessionStatus, sessionQuery } from '@/api/auth'
import { instanceSettingsQuery, organizationsQuery, type Feature } from '@/api/organizations'
import { Mark, Wordmark } from '@/components/mark'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { useHotkeys } from '@/lib/hotkeys'
import { useNotice } from '@/lib/notice'
import { signOut } from '@/lib/session'
import { Theme, setTheme, useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { palette, useCommands, type Command } from './commands'
import { Palette } from './palette'
import { ScopeFilters } from './scope-filters'
import { SECTIONS, TAB_PATHS, type Section } from './sections'

const THEMES = [
  { value: Theme.system, label: 'System', icon: Monitor },
  { value: Theme.light, label: 'Light', icon: Sun },
  { value: Theme.dark, label: 'Dark', icon: Moon },
]

function useSections(): Section[] {
  const features = useQuery(instanceSettingsQuery).data?.enabledFeatures as Feature[] | undefined
  // Until the instance settings load, show every section rather than have the nav jump.
  return SECTIONS.filter((section) => !section.feature || !features || features.includes(section.feature))
}

function SectionLink({ org, section, className, children }: { org: string; section: Section; className?: string; children: ReactNode }) {
  return section.path === 'issues' ? (
    <Link to="/$org/issues" params={{ org }} className={className}>
      {children}
    </Link>
  ) : (
    <Link to="/$org/$section" params={{ org, section: section.path }} className={className}>
      {children}
    </Link>
  )
}

function ThemeItems() {
  const theme = useTheme()
  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
      {THEMES.map(({ value, label, icon: Icon }) => (
        <DropdownMenuRadioItem key={value} value={value}>
          <Icon />
          {label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

function OrgItems({ org }: { org: string }) {
  const organizations = useQuery(organizationsQuery).data ?? []
  const navigate = useNavigate()
  return (
    <DropdownMenuRadioGroup value={org} onValueChange={(slug) => void navigate({ to: '/$org/issues', params: { org: slug } })}>
      {organizations.map((organization) => (
        <DropdownMenuRadioItem key={organization.slug} value={organization.slug} className="mono">
          {organization.slug}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

function useSignOut() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return async () => {
    await signOut(queryClient)
    await navigate({ to: '/login' })
  }
}

function TopBar({ org, current, inbox }: { org: string; current: string | undefined; inbox: boolean }) {
  const sections = useSections()
  const theme = useTheme()
  const session = useQuery(sessionQuery).data
  const email = session?.status === SessionStatus.authenticated ? (session.user.email ?? session.user.display ?? '') : ''
  const leave = useSignOut()
  const ThemeIcon = THEMES.find((t) => t.value === theme)?.icon ?? Monitor
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b px-3 md:px-4">
      <Link to="/$org/issues" params={{ org }} aria-label="Faultline">
        <Wordmark />
      </Link>
      <div className="flex min-w-0 items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-7 min-w-0 items-center gap-1.5 px-1.5 text-muted-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-accent max-lg:h-9" aria-label="Organization">
            <span className="mono truncate">{org}</span>
            <ChevronsUpDown className="size-3 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Organization</DropdownMenuLabel>
            <OrgItems org={org} />
          </DropdownMenuContent>
        </DropdownMenu>
        {inbox && (
          <>
            <span className="text-muted-foreground max-lg:hidden">/</span>
            <ScopeFilters org={org} className="max-lg:hidden" />
          </>
        )}
      </div>
      <nav className="ml-auto flex h-full items-stretch gap-4 max-lg:hidden" aria-label="Sections">
        {sections.map((section) => (
          <SectionLink
            key={section.path}
            org={org}
            section={section}
            className={cn(
              'flex items-center border-y-2 border-transparent text-sm font-medium',
              section.path === current ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {section.label}
          </SectionLink>
        ))}
      </nav>
      <div className="flex items-center gap-1 max-lg:ml-auto lg:border-l lg:pl-3">
        <Button size="sm" className="gap-1.5 px-2 max-lg:size-9 max-lg:px-0" onClick={palette.open} aria-label="Commands">
          <Search className="size-3.5 max-lg:size-4" />
          <Kbd className="border-0 px-0 opacity-100">⌘K</Kbd>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="max-lg:hidden" aria-label="Theme">
              <ThemeIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <ThemeItems />
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="max-lg:hidden" aria-label="Account">
              <span className="grid size-5 place-items-center bg-foreground text-xs font-semibold text-background uppercase">{email[0] ?? '?'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="mono normal-case tracking-normal">{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void leave()}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function TabBar({ org, current }: { org: string; current: string | undefined }) {
  const sections = useSections()
  const tabs = sections.filter((section) => TAB_PATHS.includes(section.path))
  const rest = sections.filter((section) => !TAB_PATHS.includes(section.path))
  const leave = useSignOut()
  const tab = (active: boolean) =>
    cn('flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent text-xs', active ? 'border-brand font-semibold' : 'text-muted-foreground')
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Sections">
      {tabs.map((section) => (
        <SectionLink key={section.path} org={org} section={section} className={tab(section.path === current)}>
          <section.icon className="size-5" strokeWidth={1.6} />
          {section.label}
        </SectionLink>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger className={tab(rest.some((section) => section.path === current))}>
          <Ellipsis className="size-5" strokeWidth={1.6} />
          More
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          {rest.map((section) => (
            <DropdownMenuItem key={section.path} asChild>
              <SectionLink org={org} section={section}>
                <section.icon />
                {section.label}
              </SectionLink>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <ThemeItems />
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void leave()}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}

export function AppShell({ org, children }: { org: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [, , current, ...deeper] = pathname.split('/')
  const sections = useSections()
  const organizations = useQuery(organizationsQuery).data ?? []
  const theme = useTheme()
  const navigate = useNavigate()
  const leave = useSignOut()

  const commands: Command[] = [
    ...sections.map((section) => ({
      id: `go:${section.path}`,
      group: 'go to',
      label: section.label,
      run: () =>
        void (section.path === 'issues'
          ? navigate({ to: '/$org/issues', params: { org } })
          : navigate({ to: '/$org/$section', params: { org, section: section.path } })),
    })),
    ...organizations
      .filter((organization) => organization.slug !== org)
      .map((organization) => ({
        id: `org:${organization.slug}`,
        group: 'organization',
        label: `Switch to ${organization.slug}`,
        run: () => void navigate({ to: '/$org/issues', params: { org: organization.slug } }),
      })),
    ...THEMES.filter((t) => t.value !== theme).map((t) => ({ id: `theme:${t.value}`, group: 'theme', label: `${t.label} theme`, run: () => setTheme(t.value) })),
    { id: 'sign-out', group: 'account', label: 'Sign out', run: () => void leave() },
  ]
  useCommands(commands)
  useHotkeys({ 'mod+k': palette.toggle })

  return (
    <div className="flex min-h-dvh flex-col max-lg:pb-14">
      <TopBar org={org} current={current} inbox={current === 'issues' && deeper.length === 0} />
      {children}
      <TabBar org={org} current={current} />
      <Notice />
      <Palette onSearch={(text) => void navigate({ to: '/$org/issues', params: { org }, search: { query: text } })} />
    </div>
  )
}

function Notice() {
  const notice = useNotice()
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-3 max-lg:bottom-32">
      {notice && (
        <p className={cn('pointer-events-auto max-w-md border bg-card px-3 py-2 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.35)]', notice.error && 'border-destructive text-destructive')}>
          {notice.text}
        </p>
      )}
    </div>
  )
}

// The second bar: where you are inside the section, and the page's main controls. Sticks while the page scrolls.
export function PageBar({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('sticky top-0 z-20 flex h-11 shrink-0 items-center gap-3 border-b bg-card px-3 md:px-4', className)}>{children}</div>
}

export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid flex-1 place-items-center px-4 py-16">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <Mark className="size-7 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{title}</h1>
        {children}
      </div>
    </div>
  )
}
