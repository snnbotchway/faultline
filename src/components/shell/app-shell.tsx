import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, ChevronsUpDown, Ellipsis, FolderKanban, LifeBuoy, LogOut, Monitor, Moon, Plus, Search, Settings, Sun, UserRound, Users, UsersRound } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
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
import { NewOrganizationDialog } from '@/features/settings/new-organization'
import { useHotkeys } from '@/lib/hotkeys'
import { holdNotice, NoticeHold, releaseNotice, useNotice } from '@/lib/notice'
import { signOut } from '@/lib/session'
import { valueName } from '@/lib/text'
import { Theme, useTheme } from '@/lib/theme'
import { useChooseTheme, useThemeSync } from '@/lib/theme-sync'
import { cn } from '@/lib/utils'
import { OverLimitBanner, VerifyEmailBanner } from './banners'
import { palette, CommandGroup, useCommands, type Command } from './commands'
import { Palette } from './palette'
import { ScopeFilters } from './scope-filters'
import { SupportItems, SupportMenu } from './support-menu'
import { SECTIONS, SECTION_OF_PAGE, TAB_PATHS, sectionLink, type Section } from './sections'

const THEMES = [
  { value: Theme.system, label: 'System', icon: Monitor },
  { value: Theme.light, label: 'Light', icon: Sun },
  { value: Theme.dark, label: 'Dark', icon: Moon },
]

// The organization's own pages, one click from its name: the org menu and the command palette both list them.
const ORG_PAGES = [
  { label: 'Projects', to: '/$org/projects', icon: FolderKanban },
  { label: 'Members', to: '/$org/settings/members', icon: Users },
  { label: 'Teams', to: '/$org/settings/teams', icon: UsersRound },
  { label: 'Settings', to: '/$org/settings', icon: Settings },
] as const

function useSections(): Section[] {
  const features = useQuery(instanceSettingsQuery).data?.enabledFeatures as Feature[] | undefined
  // Until the instance settings load, show every section rather than have the nav jump.
  return SECTIONS.filter((section) => !section.feature || !features || features.includes(section.feature))
}

function SectionLink({ org, section, className, children }: { org: string; section: Section; className?: string; children: ReactNode }) {
  return (
    <Link {...sectionLink(org, section)} className={className}>
      {children}
    </Link>
  )
}

function ThemeItems() {
  const theme = useTheme()
  const chooseTheme = useChooseTheme()
  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={(value) => chooseTheme(value as Theme)}>
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
        <DropdownMenuRadioItem key={organization.slug} value={organization.slug}>
          {organization.name}
          {organization.name !== organization.slug && <span className="mono ml-auto pl-4 text-muted-foreground">{organization.slug}</span>}
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
  const organizationName = useQuery(organizationsQuery).data?.find((organization) => organization.slug === org)?.name ?? org
  const email = session?.status === SessionStatus.authenticated ? (session.user.email ?? session.user.display ?? '') : ''
  const leave = useSignOut()
  const canCreate = useQuery(instanceSettingsQuery).data?.enableOrganizationCreation
  const [creating, setCreating] = useState(false)
  const ThemeIcon = THEMES.find((t) => t.value === theme)?.icon ?? Monitor
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b px-3 md:px-4">
      <Link to="/" aria-label="Faultline, all projects" className="flex h-11 items-center">
        <Wordmark />
      </Link>
      <div className="flex min-w-0 items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-7 min-w-0 items-center gap-2 px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-accent max-lg:h-11 lg:max-w-40 xl:max-w-56"
            aria-label={valueName('Organization', organizationName)}
            title={organizationName}
          >
            <span className="truncate">{organizationName}</span>
            <ChevronsUpDown className="size-3 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Organization</DropdownMenuLabel>
            <OrgItems org={org} />
            <DropdownMenuSeparator />
            {ORG_PAGES.map((page) => (
              <DropdownMenuItem key={page.to} asChild>
                <Link to={page.to} params={{ org }}>
                  <page.icon />
                  {page.label}
                </Link>
              </DropdownMenuItem>
            ))}
            {canCreate && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setCreating(true)}>
                  <Plus />
                  New organization
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {creating && <NewOrganizationDialog onClose={() => setCreating(false)} />}
        {inbox && (
          <>
            <span className="text-muted-foreground max-lg:hidden">/</span>
            <ScopeFilters org={org} className="shrink-0 max-lg:hidden" />
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
        <Button size="sm" className="gap-2 px-2 max-lg:size-11 max-lg:px-0" onClick={palette.open} aria-label="Commands" aria-keyshortcuts="Control+K Meta+K" title="Commands">
          <Search className="size-3 max-lg:size-4" />
          <Kbd className="border-0 px-0 opacity-100">⌘K</Kbd>
        </Button>
        <SupportMenu />
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
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <UserRound />
                Profile
              </Link>
            </DropdownMenuItem>
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
  // Help swaps the menu for the support links in place, so the menu stays one column that fits a small phone.
  const [help, setHelp] = useState(false)
  const tab = (active: boolean) =>
    cn('flex flex-1 flex-col items-center justify-center gap-1 border-t-2 border-transparent text-xs [&_svg]:size-4', active ? 'border-brand font-semibold' : 'text-muted-foreground')
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Sections">
      {tabs.map((section) => (
        <SectionLink key={section.path} org={org} section={section} className={tab(section.path === current)}>
          <section.icon />
          {section.label}
        </SectionLink>
      ))}
      <DropdownMenu onOpenChange={(open) => !open && setHelp(false)}>
        <DropdownMenuTrigger className={tab(rest.some((section) => section.path === current))}>
          <Ellipsis className="size-4" />
          More
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          {help ? (
            <>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  setHelp(false)
                }}
              >
                <ChevronLeft />
                Back
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Help</DropdownMenuLabel>
              <SupportItems />
            </>
          ) : (
            <>
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
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  setHelp(true)
                }}
              >
                <LifeBuoy />
                Help
                <ChevronRight className="ml-auto" />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <UserRound />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void leave()}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}

export function AppShell({ org, children }: { org: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [, first = '', inOrg, ...deeper] = pathname.split('/')
  const current = SECTION_OF_PAGE[first] ?? inOrg
  const sections = useSections()
  const organizations = useQuery(organizationsQuery).data ?? []
  const navigate = useNavigate()
  const leave = useSignOut()
  const chooseTheme = useChooseTheme()
  useThemeSync()

  const commands: Command[] = [
    ...sections
      .filter((section) => section.path !== inOrg || deeper.length > 0)
      .map((section) => ({
        id: `go:${section.path}`,
        group: CommandGroup.goTo,
        label: section.label,
        run: () => void navigate(sectionLink(org, section)),
      })),
    // A page that is also a section is already listed above.
    ...ORG_PAGES.filter((page) => !SECTIONS.some((section) => page.to === `/$org/${section.path}`)).map((page) => ({
      id: `go:${page.to}`,
      group: CommandGroup.goTo,
      label: page.label,
      run: () => void navigate({ to: page.to, params: { org } }),
    })),
    ...organizations
      .filter((organization) => organization.slug !== org)
      .map((organization) => ({
        id: `org:${organization.slug}`,
        group: CommandGroup.organization,
        label: `Switch to ${organization.name}`,
        // Names can repeat; the slug tells two apart and can be searched.
        detail: organization.name === organization.slug ? undefined : organization.slug,
        run: () => void navigate({ to: '/$org/issues', params: { org: organization.slug } }),
      })),
    ...THEMES.map((t) => ({ id: `theme:${t.value}`, group: CommandGroup.theme, label: `${t.label} theme`, run: () => chooseTheme(t.value) })),
    { id: 'profile', group: CommandGroup.account, label: 'Profile', run: () => void navigate({ to: '/profile' }) },
    { id: 'sign-out', group: CommandGroup.account, label: 'Sign out', run: () => void leave() },
  ]
  useCommands(commands)
  useHotkeys({ 'mod+k': palette.toggle })

  return (
    <div className="flex min-h-dvh flex-col max-lg:pb-14">
      <SkipLink />
      <TopBar org={org} current={current} inbox={current === 'issues' && deeper.length === 0} />
      <VerifyEmailBanner />
      <OverLimitBanner org={org} />
      <Main>{children}</Main>
      <TabBar org={org} current={current} />
      <Notice />
      <Palette onSearch={(text) => void navigate({ to: '/$org/issues', params: { org }, search: { query: text } })} />
    </div>
  )
}

const MAIN_ID = 'main'

// The first stop on Tab, shown only while focused, so a keyboard user can pass the top bar.
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_ID}`}
      onClick={(event) => {
        event.preventDefault()
        document.getElementById(MAIN_ID)?.focus()
      }}
      className="fixed top-1 left-1 z-[70] -translate-y-16 border bg-card px-3 py-2 text-sm font-medium shadow-float focus:translate-y-0"
    >
      Skip to content
    </a>
  )
}

export function Main({ children }: { children: ReactNode }) {
  return (
    <main id={MAIN_ID} tabIndex={-1} className="flex flex-1 flex-col focus-visible:outline-none">
      {children}
    </main>
  )
}

export function Notice() {
  const notice = useNotice()
  useEffect(() => releaseNotice, [])
  return (
    // While a dialog or sheet is open (the page's scroll is locked), the message moves to the top so it never covers it.
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-3 max-lg:bottom-32 [body[data-scroll-locked]_&]:top-4 [body[data-scroll-locked]_&]:bottom-auto"
    >
      {notice && (
        <p
          onPointerEnter={() => holdNotice(NoticeHold.pointer, true)}
          onPointerLeave={() => holdNotice(NoticeHold.pointer, false)}
          onFocus={() => holdNotice(NoticeHold.focus, true)}
          onBlur={() => holdNotice(NoticeHold.focus, false)}
          className={cn('pointer-events-auto flex max-w-md items-center gap-3 border bg-card px-3 py-2 shadow-float', notice.error && 'border-destructive text-destructive')}>
          {notice.text}
          {notice.action && (
            <Button variant="link" className="text-foreground underline" onClick={notice.action.run}>
              {notice.action.label}
            </Button>
          )}
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
