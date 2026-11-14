import { Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { OrgRole } from '@/api/members'
import type { Project } from '@/api/projects'
import type { Team } from '@/api/teams'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CodeBlock, FormDialog, Segmented } from './parts'
import { OTHER_PLATFORM, PLATFORMS, PLATFORM_GROUPS, platformOf } from './platforms'
import { ROLES, ROLE_ADDS, ROLE_LABEL } from './roles'

// A question with a yes that changes something: removing a member, deleting a key.
export function Confirm({
  open,
  onClose,
  title,
  confirm,
  destructive,
  onConfirm,
  pending,
  error,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  confirm: string
  destructive?: boolean
  onConfirm: () => void
  pending: boolean
  error?: string
  children?: ReactNode
}) {
  return (
    <FormDialog open={open} onClose={onClose} title={title} submit={confirm} destructive={destructive} onSubmit={onConfirm} pending={pending} error={error}>
      {children && <p className="prose-text">{children}</p>}
    </FormDialog>
  )
}

// The role control, with what each role may do one click away. `allowOwner` is false for anyone but an owner.
export function RoleField({ value, onChange, allowOwner }: { value: OrgRole; onChange: (next: OrgRole) => void; allowOwner: boolean }) {
  const options = ROLES.filter((role) => allowOwner || role !== 'owner').map((role) => ({ value: role, label: ROLE_LABEL[role] }))
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-5 items-center justify-between">
        <span className="text-sm font-medium">Role</span>
        <Popover>
          <PopoverTrigger className="text-sm font-medium text-brand underline-offset-4 hover:underline max-lg:flex max-lg:h-11 max-lg:items-center">Compare roles</PopoverTrigger>
          <PopoverContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)] p-0">
            <dl>
              {ROLES.map((role) => (
                <div key={role} className={cn('flex flex-col gap-0.5 border-b px-3 py-2.5 last:border-b-0', role === value && 'bg-selected')}>
                  <dt className="text-sm font-semibold">{ROLE_LABEL[role]}</dt>
                  <dd className="text-sm text-muted-foreground">{ROLE_ADDS[role]}</dd>
                </div>
              ))}
            </dl>
          </PopoverContent>
        </Popover>
      </div>
      <Segmented value={value} options={options} onChange={onChange} label="Role" />
    </div>
  )
}

// Teams as a checklist: every row reads as a choice, picked or not. Each names the projects it opens.
export function TeamChecklist({
  teams,
  projects,
  value,
  onChange,
  className,
}: {
  teams: Team[]
  projects: Project[]
  value: string[]
  onChange: (next: string[]) => void
  className?: string
}) {
  if (!teams.length) return <p className="text-sm text-muted-foreground">No teams yet</p>
  return (
    <div role="group" aria-label="Teams" className={cn('border bg-card', className)}>
      {teams.map((team) => (
        <label key={team.slug} className="flex min-h-10 cursor-pointer items-center gap-2.5 border-b px-2.5 py-1.5 last:border-b-0 hover:bg-accent max-lg:min-h-11">
          <Checkbox checked={value.includes(team.slug)} onCheckedChange={(next) => onChange(next ? [...value, team.slug] : value.filter((slug) => slug !== team.slug))} />
          <span className="mono shrink-0 whitespace-nowrap">#{team.slug}</span>
          <span className="mono min-w-0 flex-1 text-right text-muted-foreground">
            {projects
              .filter((project) => project.teams.some((t) => t.slug === team.slug))
              .map((project) => project.slug)
              .join(' ')}
          </span>
        </label>
      ))}
    </div>
  )
}

// Every platform under its group, all on the page: nothing scrolls inside, so nothing opens cut off.
export function PlatformPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const shown = PLATFORMS.filter((platform) => platform.name.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <div className="border">
      <div className="relative border-b">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a platform" aria-label="Find a platform" className="border-0 pl-8" />
      </div>
      <div role="radiogroup" aria-label="Platform">
        {PLATFORM_GROUPS.filter((group) => shown.some((platform) => platform.group === group)).map((group) => (
          <div key={group} role="presentation">
            <h3 className="label-caps flex h-7 items-center border-b bg-muted px-3">{group}</h3>
            <div className="grid grid-cols-2 gap-px border-b bg-border last:border-b-0">
              {shown
                .filter((platform) => platform.group === group)
                .map((platform, index, list) => (
                  <button
                    key={platform.id}
                    type="button"
                    role="radio"
                    aria-checked={platform.id === value}
                    onClick={() => onChange(platform.id)}
                    className={cn(
                      'flex h-9 items-center px-3 text-left text-sm -outline-offset-2 max-lg:h-11',
                      platform.id === value ? 'bg-foreground font-medium text-background' : 'bg-background hover:bg-accent',
                      // An odd one out fills its row, so no empty cell shows the grid's colour.
                      index === list.length - 1 && list.length % 2 === 1 && 'col-span-2',
                    )}
                  >
                    {platform.name}
                  </button>
                ))}
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">No platform matches “{query.trim()}”.</p>}
      </div>
    </div>
  )
}

// The two things to paste for a platform: the install command, and the code that starts the SDK with this DSN.
export function Snippets({ platform, dsn, className }: { platform: string | null | undefined; dsn: string; className?: string }) {
  const chosen = platformOf(platform) ?? platformOf(OTHER_PLATFORM)!
  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      {chosen.install && <CodeBlock label="Install" code={chosen.install} />}
      <CodeBlock label={chosen.file} code={chosen.code(dsn)} />
    </div>
  )
}
