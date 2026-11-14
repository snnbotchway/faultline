import { useQueries, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useEffect } from 'react'
import { Scope, environmentsQuery, projectsQuery } from '@/api/organizations'
import { projectEnvironmentsQuery, shownEnvironmentNames } from '@/api/projects'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { InboxSearch } from '@/features/issues/search'
import { useAccess } from '@/features/settings/access'
import { cn } from '@/lib/utils'

const TRIGGER = 'flex h-7 min-w-0 items-center gap-2 px-2 text-sm hover:bg-accent aria-expanded:bg-accent max-lg:h-11 max-lg:border max-lg:bg-card max-lg:px-3'
const ALL_ENVIRONMENTS = ''

// Project and environment filters of the inbox. They live in the URL, so a filtered view can be shared.
export function ScopeFilters({ org, className }: { org: string; className?: string }) {
  const search = useSearch({ strict: false }) as InboxSearch
  const navigate = useNavigate()
  const can = useAccess(org)
  const projects = useQuery(projectsQuery(org)).data ?? []
  const picked = search.project ?? []
  // Only the environments of the chosen projects; with none chosen, those of the whole organization.
  const slugs = picked.flatMap((id) => projects.find((project) => Number(project.id) === id)?.slug ?? [])
  const orgEnvironments = useQuery(environmentsQuery(org)).data
  const projectEnvironments = useQueries({ queries: slugs.map((slug) => projectEnvironmentsQuery(org, slug)) })
  const environments = [
    ...new Set(slugs.length > 0 ? projectEnvironments.flatMap((result) => shownEnvironmentNames(result.data)) : (orgEnvironments ?? []).map((environment) => environment.name)),
  ].sort()
  const update = (patch: Partial<InboxSearch>) =>
    void navigate({ to: '/$org/issues', params: { org }, search: (previous) => ({ ...previous, ...patch }), replace: true })
  // Each pick reads the URL as it is then, so quick clicks while the menu stays open all count.
  const toggle = (id: number) =>
    void navigate({
      to: '/$org/issues',
      params: { org },
      search: (previous) => {
        const current = previous.project ?? []
        const next = current.includes(id) ? current.filter((project) => project !== id) : [...current, id]
        return { ...previous, project: next.length > 0 ? next : undefined }
      },
      replace: true,
    })
  // The chosen environment stays only while one of the chosen projects has it. It is dropped once
  // their lists have loaded, and kept when a list fails to load.
  const listsLoaded = slugs.length > 0 ? projectEnvironments.every((result) => result.isSuccess) : orgEnvironments !== undefined
  const missing = !!search.environment && listsLoaded && !environments.includes(search.environment)
  useEffect(() => {
    if (missing)
      void navigate({ to: '/$org/issues', params: { org }, search: (previous) => ({ ...previous, environment: undefined }), replace: true })
  }, [missing, navigate, org])
  const projectLabel =
    picked.length === 0
      ? 'All projects'
      : picked.length === 1
        ? (projects.find((project) => Number(project.id) === picked[0])?.slug ?? '1 project')
        : `${picked.length} projects`

  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger className={TRIGGER} aria-label="Projects">
          <span className={cn('truncate', picked.length === 1 && 'mono')}>{projectLabel}</span>
          <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => update({ project: undefined })}>
            <Check className={cn(picked.length > 0 && 'invisible')} />
            All projects
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onSelect={(event) => {
                event.preventDefault()
                toggle(Number(project.id))
              }}
            >
              <Check className={cn(!picked.includes(Number(project.id)) && 'invisible')} />
              <span className="mono">{project.slug}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {can(Scope.projectWrite) && (
        <Link
          to="/$org/settings/projects/new"
          params={{ org }}
          aria-label="New project"
          title="New project"
          className="grid size-7 shrink-0 place-items-center text-muted-foreground hover:bg-accent hover:text-foreground max-lg:size-11 max-lg:border max-lg:bg-card"
        >
          <Plus className="size-4" />
        </Link>
      )}
      <span className="text-muted-foreground max-lg:hidden">/</span>
      <DropdownMenu>
        <DropdownMenuTrigger className={TRIGGER} aria-label="Environment">
          <span className={cn('truncate', search.environment && 'mono')}>{search.environment ?? 'All environments'}</span>
          <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value={search.environment ?? ALL_ENVIRONMENTS} onValueChange={(value) => update({ environment: value || undefined })}>
            <DropdownMenuRadioItem value={ALL_ENVIRONMENTS}>All environments</DropdownMenuRadioItem>
            {environments.map((name) => (
              <DropdownMenuRadioItem key={name} value={name} className="mono">
                {name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
