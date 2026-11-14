import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight, Plus, Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { ORGANIZATION_NAME_MAX, Scope, instanceSettingsQuery, membersQuery, organizationActions, organizationQuery, projectsQuery, teamsQuery } from '@/api/organizations'
import { signInAppsQuery } from '@/api/sign-in-apps'
import { stale } from '@/api/stale'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { useHotkeys } from '@/lib/hotkeys'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { useAccess, useChange } from './access'
import { DeleteDialog, Field, FoldRow, Group, GroupAction, InlineForm, LinkRow, ROW, Row, RowSkeleton, Sheet } from './parts'
import { plural } from '@/lib/text'
import { teamList } from './labels'
import { useFold } from './rows'
import { platformName } from './platforms'
import { matchEntries, settingsEntries } from './search'
import { SignInApps } from './sign-in-apps'

/**
 * Everything that can be set for an organization, on one page: itself, its people, its projects.
 * Typing in the search replaces the page with the settings, people and projects that match.
 */
export function SettingsIndex({ org }: { org: string }) {
  useTitle('Settings', org)
  const can = useAccess(org)
  const navigate = useNavigate()
  const organization = useQuery(organizationQuery(org)).data
  const members = useQuery(membersQuery(org)).data
  const teams = useQuery(teamsQuery(org)).data
  const projects = useQuery(projectsQuery(org)).data
  const version = useQuery(instanceSettingsQuery).data?.version
  const signInApps = useQuery({ ...signInAppsQuery(org), enabled: can(Scope.orgWrite) }).data
  const [query, setQuery] = useState('')
  const [deleting, setDeleting] = useState(false)
  const search = useRef<HTMLInputElement>(null)
  const row = useFold()
  useHotkeys({
    '/': (event) => {
      event.preventDefault()
      search.current?.focus()
    },
  })

  const loaded = organization && members && teams && projects
  const found = loaded ? matchEntries(settingsEntries({ organization, members, teams, projects, signInApps, version }), query) : []
  const invited = members?.filter((member) => member.pending).length ?? 0

  return (
    <>
      <PageBar className="max-lg:h-auto max-lg:flex-wrap max-lg:gap-y-0 max-lg:pb-2">
        <h1 className="font-semibold max-lg:flex max-lg:h-11 max-lg:w-full max-lg:items-center">Settings</h1>
        <div className="relative w-full lg:ml-3 lg:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && found[0]) void navigate(found[0].link)
            }}
            placeholder="Find a setting, project or person"
            aria-label="Find a setting, project or person"
            className="h-8 pl-9"
          />
          <Kbd className="absolute top-1/2 right-2 -translate-y-1/2 max-lg:hidden">/</Kbd>
        </div>
      </PageBar>
      <Sheet>
        {!loaded ? (
          <RowSkeleton rows={8} />
        ) : query.trim() ? (
          <ul aria-label="Matches">
            {found.map((entry, index) => (
              <li key={entry.path.join('/')}>
                <Link {...entry.link} className={cn(ROW, '-outline-offset-2 hover:bg-accent', index === 0 && 'bg-selected')}>
                  <span className="flex min-w-0 flex-1 flex-col py-2 lg:flex-row lg:items-center lg:gap-3">
                    <span className="min-w-0 truncate">
                      {entry.path.slice(0, -1).map((part) => (
                        <span key={part} className="text-muted-foreground">
                          {part} ›{' '}
                        </span>
                      ))}
                      <span className="font-medium">{entry.path.at(-1)}</span>
                    </span>
                    <span className="mono min-w-0 truncate text-muted-foreground lg:ml-auto lg:max-w-[45%]">{entry.value}</span>
                  </span>
                  {index === 0 && <Kbd className="max-lg:hidden">↵</Kbd>}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
            {found.length === 0 && <li className="px-3 py-10 text-center text-muted-foreground md:px-4">Nothing in settings matches “{query.trim()}”.</li>}
          </ul>
        ) : (
          <>
            <Group label="Organization">
              <FoldRow label="Name" value={organization.name} open={row.is('name')} onToggle={can(Scope.orgWrite) ? () => row.toggle('name') : undefined}>
                <RenameOrganization org={org} name={organization.name} onDone={row.close} />
              </FoldRow>
            </Group>

            <Group
              label="People"
              action={
                can(Scope.memberWrite) && (
                  <GroupAction asChild>
                    <Link to="/$org/settings/members/new" params={{ org }}>
                      <Plus />
                      Invite members
                    </Link>
                  </GroupAction>
                )
              }
            >
              <LinkRow
                label="Members"
                value={`${plural(members.length - invited, 'member')}${invited ? ` · ${invited} invited` : ''}`}
                to="/$org/settings/members"
                params={{ org }}
              />
              <LinkRow
                label="Teams"
                mono={teams.length > 0}
                value={teams.length ? teamList(teams.map((team) => team.slug)) : 'None yet'}
                to="/$org/settings/teams"
                params={{ org }}
              />
            </Group>

            {can(Scope.orgWrite) && <SignInApps org={org} />}

            <Group
              label="Projects"
              action={
                can(Scope.projectWrite) && (
                  <GroupAction asChild>
                    <Link to="/$org/settings/projects/new" params={{ org }}>
                      <Plus />
                      New project
                    </Link>
                  </GroupAction>
                )
              }
            >
              {projects.map((project) => (
                <LinkRow
                  key={project.id}
                  label={<span className="mono break-words">{project.slug}</span>}
                  value={
                    <>
                      {platformName(project.platform)}
                      {project.teams.length > 0 && (
                        <span className="max-lg:hidden">
                          {' · '}
                          <span className="mono">{teamList(project.teams.map((team) => team.slug))}</span>
                        </span>
                      )}
                      {!project.firstEvent && ' · no events yet'}
                    </>
                  }
                  to="/$org/settings/projects/$project"
                  params={{ org, project: project.slug ?? '' }}
                />
              ))}
              {projects.length === 0 && <Row label="No projects yet" />}
            </Group>

            <Group label="Server">
              <LinkRow label="System info" mono value={version} to="/system-info" />
            </Group>

            {can(Scope.orgAdmin) && (
              <Group label="Danger">
                <Row
                  label="Delete organization"
                  action={
                    <Button variant="destructive" size="bar" onClick={() => setDeleting(true)}>
                      Delete
                    </Button>
                  }
                />
              </Group>
            )}
          </>
        )}
      </Sheet>
      {deleting && loaded && (
        <DeleteOrganization org={org} loses={`${plural(projects.length, 'project')}, their issues and ${plural(members.length, 'membership')} are deleted for good.`} onClose={() => setDeleting(false)} />
      )}
    </>
  )
}

function RenameOrganization({ org, name, onDone }: { org: string; name: string; onDone: () => void }) {
  const [value, setValue] = useState(name)
  const rename = useChange('rename the organization', () => organizationActions.rename(org, value.trim()), { stale: [stale.organizations, stale.organization(org)], onDone })
  return (
    <InlineForm onSubmit={() => rename.run()} onCancel={onDone} pending={rename.pending} error={rename.error} disabled={!value.trim() || value.trim() === name}>
      <Field label="Name" className="max-w-sm">
        {(field) => <Input {...field} autoFocus value={value} onChange={(event) => setValue(event.target.value)} maxLength={ORGANIZATION_NAME_MAX} />}
      </Field>
    </InlineForm>
  )
}

function DeleteOrganization({ org, loses, onClose }: { org: string; loses: string; onClose: () => void }) {
  const navigate = useNavigate()
  const remove = useChange('delete the organization', () => organizationActions.remove(org), {
    stale: [stale.organizations],
    leavesPage: true,
    onDone: () => void navigate({ to: '/' }),
  })
  return <DeleteDialog open onClose={onClose} what="organization" name={org} loses={loses} onDelete={() => remove.run()} pending={remove.pending} error={remove.error} />
}
