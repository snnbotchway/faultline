import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plug, Plus, Settings } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Scope, instanceSettingsQuery, organizationsQuery, projectsQuery } from '@/api/organizations'
import { ACTIVITY_DAYS, projectActivityQuery, projectAlertCountQuery, type Project } from '@/api/projects'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ago, exact } from '@/features/issues/format'
import { Trace } from '@/features/issues/trace'
import { useAccess, useLastOrganization } from '@/features/settings/access'
import { platformName } from '@/features/settings/platforms'
import { useT } from '@/i18n'
import { hasWords, searchWords } from '@/lib/text'
import { useSeen } from '@/lib/seen'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'

// On a phone the open column is as wide as each language's header needs (`openWidth` in the catalog).
const GRID =
  'grid items-center gap-x-4 px-3 md:px-4 grid-cols-[var(--open)_minmax(0,1fr)_5.5rem] lg:grid-cols-[4rem_minmax(0,1fr)_18rem_7rem_4rem_2rem]'

/**
 * Every project the user can see, with how it is doing: open issues, errors per day, when it last broke.
 * Without `org` it lists the projects of all their organizations, grouped; with it, that organization's alone.
 */
export function ProjectList({ org }: { org?: string }) {
  const { projects: t, common } = useT()
  useTitle(t.title, org)
  const organizations = useQuery(organizationsQuery)
  const last = useLastOrganization()
  const slugs = org ? [org] : (organizations.data ?? []).map((organization) => organization.slug)
  const nameOf = (slug: string) => organizations.data?.find((organization) => organization.slug === slug)?.name ?? slug
  const lists = useQueries({ queries: slugs.map((slug) => projectsQuery(slug)) })
  const [query, setQuery] = useState('')
  const canCreateOrganization = useQuery(instanceSettingsQuery).data?.enableOrganizationCreation
  // New projects go into the organization on screen, or the one the shell is showing.
  const target = org ?? last

  if (!organizations.isPending && slugs.length === 0)
    return (
      <Screen title={t.noOrganization}>
        {canCreateOrganization ? (
          <Button asChild variant="default">
            <Link to="/organizations/new">{t.createOrganization}</Link>
          </Button>
        ) : (
          <p className="prose-text text-muted-foreground">{t.askOwner}</p>
        )}
      </Screen>
    )

  const words = searchWords(query)
  const groups = slugs.map((slug, index) => ({
    slug,
    name: nameOf(slug),
    pending: lists[index]?.isPending ?? true,
    projects: (lists[index]?.data ?? [])
      .filter((project) => hasWords(`${slug} ${nameOf(slug)} ${project.slug} ${project.name} ${platformName(project.platform)}`, words))
      .sort((a, b) => (a.slug ?? '').localeCompare(b.slug ?? '')),
  }))
  const loading = organizations.isPending || groups.some((group) => group.pending)
  const total = lists.reduce((sum, list) => sum + (list.data?.length ?? 0), 0)
  const shown = groups.reduce((sum, group) => sum + group.projects.length, 0)
  const find = (className: string) => (
    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.find} aria-label={t.find} className={className} />
  )
  const empty = !loading && total === 0

  return (
    <>
      <PageBar>
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        {org && <span className="min-w-0 truncate text-muted-foreground max-lg:hidden">{nameOf(org)}</span>}
        {!empty && (
          <>
            {find('h-8 w-56 max-lg:hidden')}
            <span className="ml-auto">{target && <NewProjectButton org={target} size="bar" />}</span>
          </>
        )}
      </PageBar>
      {empty ? (
        <Screen title={t.noProjects}>{target && <NewProjectButton org={target} />}</Screen>
      ) : (
        <div style={{ '--open': t.openWidth } as CSSProperties}>
          <div className="border-b px-3 py-2 lg:hidden">{find('h-9')}</div>
          <div className={cn(GRID, 'h-8 border-b')}>
            <span className="label-caps text-right">{t.columns.open}</span>
            <span className="label-caps">{common.project}</span>
            <span className="label-caps max-lg:text-right">
              <span className="lg:hidden">{common.time.ago.days(ACTIVITY_DAYS)}</span>
              <span className="max-lg:hidden">{t.columns.errors(ACTIVITY_DAYS)}</span>
            </span>
            <span className="label-caps text-right whitespace-nowrap max-lg:hidden">{t.columns.lastSeen}</span>
            <span className="label-caps text-right max-lg:hidden">{t.columns.alerts}</span>
            <span className="max-lg:hidden" />
          </div>
          {groups.map((group) => (
            <section key={group.slug} aria-label={group.name === group.slug ? group.name : `${group.name} (${group.slug})`}>
              {!org && (group.pending || group.projects.length > 0) && (
                <div className="flex h-8 items-center gap-2 border-b bg-muted px-3 md:px-4">
                  <h2 className="font-medium">{group.name}</h2>
                  {group.name !== group.slug && <span className="mono text-muted-foreground">{group.slug}</span>}
                  {!group.pending && <span className="mono text-muted-foreground">{group.projects.length}</span>}
                </div>
              )}
              {group.pending ? (
                <div className={cn(GRID, 'h-14 border-b')} aria-busy>
                  <span />
                  <Skeleton className="h-3 w-40" />
                </div>
              ) : (
                <ul>
                  {group.projects.map((project) => (
                    <ProjectRow key={project.id} org={group.slug} project={project} />
                  ))}
                </ul>
              )}
            </section>
          ))}
          {!loading && shown === 0 && <p className="px-3 py-10 text-center text-muted-foreground">{t.noMatch(query)}</p>}
        </div>
      )}
    </>
  )
}

// In the page bar it takes the bar's size; on the empty page it is the page's one action, at the default size.
function NewProjectButton({ org, size }: { org: string; size?: 'bar' }) {
  const t = useT().projects
  const can = useAccess(org)
  if (!can(Scope.projectWrite)) return null
  return (
    <Button asChild variant="default" size={size}>
      <Link to="/$org/settings/projects/new" params={{ org }}>
        <Plus />
        {t.newProject}
      </Link>
    </Button>
  )
}

function ProjectRow({ org, project }: { org: string; project: Project }) {
  const t = useT().projects
  const slug = project.slug ?? ''
  const fresh = !project.firstEvent
  // Each row costs four requests, so a long list asks only for the rows that come on screen.
  const [ref, seen] = useSeen<HTMLLIElement>()
  // Coming back to the tab would ask again for every row at once; the 60 s cache is fresh enough.
  const activity = useQuery({ ...projectActivityQuery(org, project.id), enabled: seen && !fresh, refetchOnWindowFocus: false }).data
  const lastSeen = activity?.lastSeen
  const alerts = useQuery({ ...projectAlertCountQuery(org, slug), enabled: seen, refetchOnWindowFocus: false }).data
  return (
    <li ref={ref} className={cn(GRID, 'relative min-h-14 border-b hover:bg-accent')}>
      {fresh ? (
        <Link to="/$org/settings/projects/$project" params={{ org, project: slug }} className="absolute inset-0 -outline-offset-2" aria-label={t.setUp(slug)} />
      ) : (
        <Link to="/$org/issues" params={{ org }} search={{ project: [Number(project.id)] }} className="absolute inset-0 -outline-offset-2" aria-label={t.issuesIn(slug)} />
      )}
      <span className={cn('mono text-right text-lg font-medium', activity?.unresolved === 0 && 'text-muted-foreground')}>
        {activity && `${activity.unresolved}${activity.capped ? '+' : ''}`}
      </span>
      <div className="flex min-w-0 flex-col py-2">
        <span className="mono truncate font-medium">{slug}</span>
        <span className="truncate text-sm text-muted-foreground">
          {platformName(project.platform)}
          {lastSeen && <span className="lg:hidden"> · {ago(lastSeen)}</span>}
          {!!alerts && <span className="lg:hidden"> · {t.alertCount(alerts)}</span>}
        </span>
      </div>
      {fresh ? <span className="text-sm text-muted-foreground">{t.noEventsYet}</span> : activity ? <Trace buckets={activity.buckets} height={24} /> : <span />}
      <span className="mono text-right text-muted-foreground max-lg:hidden" title={lastSeen && exact(lastSeen)}>
        {lastSeen && ago(lastSeen)}
      </span>
      <span className={cn('mono text-right max-lg:hidden', !alerts && 'text-muted-foreground')}>{alerts}</span>
      {/* The same on every row, so it is an icon; its name shows on hover. */}
      <Button asChild variant="ghost" size="icon" className="relative z-10 justify-self-end text-muted-foreground hover:text-foreground max-lg:hidden" aria-label={fresh ? t.setUp(slug) : t.settingsOf(slug)}>
        <Link to="/$org/settings/projects/$project" params={{ org, project: slug }}>
          {fresh ? <Plug /> : <Settings />}
        </Link>
      </Button>
    </li>
  )
}
