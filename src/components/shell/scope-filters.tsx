import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Check, ChevronsUpDown } from 'lucide-react'
import { environmentsQuery, projectsQuery } from '@/api/organizations'
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
import { cn } from '@/lib/utils'

const TRIGGER = 'flex h-7 min-w-0 items-center gap-2 px-2 text-sm hover:bg-accent aria-expanded:bg-accent max-lg:h-11 max-lg:border max-lg:bg-card max-lg:px-3'
const ALL_ENVIRONMENTS = ''

// Project and environment filters of the inbox. They live in the URL, so a filtered view can be shared.
export function ScopeFilters({ org, className }: { org: string; className?: string }) {
  const search = useSearch({ strict: false }) as InboxSearch
  const navigate = useNavigate()
  const projects = useQuery(projectsQuery(org)).data ?? []
  const environments = [...new Set((useQuery(environmentsQuery(org)).data ?? []).map((environment) => environment.name))].sort()
  const picked = search.project ?? []
  const update = (patch: Partial<InboxSearch>) =>
    void navigate({ to: '/$org/issues', params: { org }, search: (previous) => ({ ...previous, ...patch }), replace: true })
  const toggle = (id: number) => {
    const next = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]
    update({ project: next.length > 0 ? next : undefined })
  }
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
