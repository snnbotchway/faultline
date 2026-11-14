import { useQuery } from '@tanstack/react-query'
import { ChevronsUpDown } from 'lucide-react'
import { projectsQuery } from '@/api/organizations'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const ALL = ''

// Narrows a screen to one project.
export function ProjectMenu({ org, project, onChange, className }: { org: string; project: number | undefined; onChange: (project: number | undefined) => void; className?: string }) {
  const projects = useQuery(projectsQuery(org)).data ?? []
  const current = projects.find((item) => Number(item.id) === project)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Project"
        className={cn('flex h-7 min-w-0 shrink-0 items-center gap-2 border bg-card px-3 text-sm hover:bg-accent aria-expanded:bg-accent max-lg:h-11', className)}
      >
        <span className={cn('truncate', current && 'mono')}>{current?.slug ?? 'All projects'}</span>
        <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={project === undefined ? ALL : String(project)} onValueChange={(value) => onChange(value === ALL ? undefined : Number(value))}>
          <DropdownMenuRadioItem value={ALL}>All projects</DropdownMenuRadioItem>
          {projects.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={String(item.id)} className="mono">
              {item.slug}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
