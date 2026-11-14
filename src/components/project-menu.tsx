import { useQuery } from '@tanstack/react-query'
import { ChevronsUpDown } from 'lucide-react'
import { projectsQuery } from '@/api/organizations'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { plural } from '@/lib/text'
import { cn } from '@/lib/utils'

const ALL = ''

// Narrows a screen to one project. A link from the stock UI may carry several, which read as a count
// until one is picked.
export function ProjectMenu({ org, value, onChange, className }: { org: string; value: number[] | undefined; onChange: (value: number[] | undefined) => void; className?: string }) {
  const projects = useQuery(projectsQuery(org)).data ?? []
  const project = value?.length === 1 ? value[0] : undefined
  const current = projects.find((item) => Number(item.id) === project)
  const label = current?.slug ?? (value && value.length > 1 ? plural(value.length, 'project') : 'All projects')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Project: ${label}`}
        className={cn('flex h-7 min-w-0 shrink-0 items-center gap-2 border bg-card px-3 text-sm hover:bg-accent aria-expanded:bg-accent max-lg:h-11', className)}
      >
        <span className={cn('truncate', current && 'mono')}>{label}</span>
        <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={project === undefined ? ALL : String(project)} onValueChange={(picked) => onChange(picked === ALL ? undefined : [Number(picked)])}>
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
