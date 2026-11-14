import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '@/api/client'
import { Scope, projectsQuery, teamsQuery } from '@/api/organizations'
import {
  PROJECT_NAME_MAX,
  projectActions,
  projectEnvironmentsQuery,
  projectKeysQuery,
  projectQuery,
  type Project,
  type ProjectEnvironment,
  type ProjectKey,
} from '@/api/projects'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { useAccess, useChange } from './access'
import { Confirm, TeamChecklist } from './fields'
import { CopyField, DeleteDialog, Field, FoldRow, FormDialog, Group, GroupAction, InlineForm, ROW, Row, RowSkeleton, SettingsBar, Sheet, Tabs, type TabItem } from './parts'
import { useFold } from './rows'
import { OTHER_PLATFORM, PLATFORMS, platformName } from './platforms'
import { ProjectSetup } from './project-setup'
import { ProjectTab } from './project-tabs'

/**
 * One project's settings. Until its first event arrives the page opens on the set-up step; after that on General.
 * Each tab has an address (`?tab=`), the stock one, so links from old emails land on the right tab.
 */
export function ProjectPage({ org, slug, tab }: { org: string; slug: string; tab?: ProjectTab }) {
  useTitle(slug, 'Settings')
  const can = useAccess(org)
  const project = useQuery(projectQuery(org, slug))
  // The detail carries no teams; the organization's list does.
  const listed = useQuery(projectsQuery(org)).data?.find((p) => p.slug === slug)
  const keys = useQuery(projectKeysQuery(org, slug)).data
  const environments = useQuery(projectEnvironmentsQuery(org, slug)).data

  if (project.error instanceof ApiError && project.error.status === 404)
    return (
      <>
        <SettingsBar org={org} title={slug} mono />
        <Screen title="No such project">
          <Button asChild className="max-lg:h-11">
            <Link to="/$org/settings" params={{ org }}>
              Back to settings
            </Link>
          </Button>
        </Screen>
      </>
    )

  const current = tab ?? (project.data && !project.data.firstEvent ? ProjectTab.setup : ProjectTab.general)
  const tabs: TabItem<ProjectTab>[] = [
    { value: ProjectTab.setup, label: 'Set up' },
    { value: ProjectTab.general, label: 'General' },
    { value: ProjectTab.keys, label: 'Client keys', count: keys?.length },
    { value: ProjectTab.environments, label: 'Environments', count: environments?.length },
  ]
  const write = can(Scope.projectWrite)

  return (
    <>
      <SettingsBar org={org} title={slug} mono>
        {project.data?.firstEvent && (
          <Button asChild size="sm" className="max-lg:h-9 touch-hit">
            <Link to="/$org/issues" params={{ org }} search={{ project: [Number(project.data.id)] }}>
              Issues
            </Link>
          </Button>
        )}
      </SettingsBar>
      <Sheet>
        {!project.data ? (
          <RowSkeleton rows={6} />
        ) : (
          <>
            <Tabs
              label="Project settings"
              tabs={tabs}
              current={current}
              link={(value) => ({ to: '/$org/settings/projects/$project', params: { org, project: slug }, search: { tab: value } })}
            />
            {current === ProjectTab.setup && <ProjectSetup org={org} project={project.data} dsn={keys?.[0]?.dsn.public} keysLoaded={!!keys} write={write} />}
            {current === ProjectTab.general && <General org={org} project={project.data} teams={listed?.teams.map((team) => team.slug)} write={write} admin={can(Scope.projectAdmin)} />}
            {current === ProjectTab.keys && <Keys org={org} slug={slug} keys={keys} write={write} />}
            {current === ProjectTab.environments && <Environments org={org} slug={slug} environments={environments} write={write} />}
          </>
        )}
      </Sheet>
    </>
  )
}

/* ---------- general ---------- */

function General({ org, project, teams, write, admin }: { org: string; project: Pick<Project, 'name' | 'slug' | 'platform' | 'eventThrottleRate'>; teams?: string[]; write: boolean; admin: boolean }) {
  const slug = project.slug ?? ''
  const row = useFold()
  const [deleting, setDeleting] = useState(false)
  const edit = (id: string) => (write ? () => row.toggle(id) : undefined)
  return (
    <>
      <Group label="General">
        <FoldRow label="Name" value={project.name} open={row.is('name')} onToggle={edit('name')}>
          <NameForm org={org} slug={slug} name={project.name} onDone={row.close} />
        </FoldRow>
        <FoldRow label="Platform" value={platformName(project.platform)} open={row.is('platform')} onToggle={edit('platform')}>
          <PlatformForm org={org} slug={slug} name={project.name} platform={project.platform} onDone={row.close} />
        </FoldRow>
        <FoldRow
          label="Teams with access"
          mono={!!teams?.length}
          value={teams && (teams.length ? teams.map((team) => `#${team}`).join('  ') : 'None')}
          open={row.is('teams')}
          onToggle={teams && edit('teams')}
        >
          {teams && <TeamsForm org={org} slug={slug} teams={teams} onDone={row.close} />}
        </FoldRow>
        <FoldRow label="Events to drop" mono value={`${project.eventThrottleRate}%`} open={row.is('throttle')} onToggle={edit('throttle')}>
          <ThrottleForm org={org} slug={slug} name={project.name} rate={project.eventThrottleRate} onDone={row.close} />
        </FoldRow>
      </Group>
      {admin && (
        <Group label="Danger">
          <Row
            label="Delete project"
            action={
              <Button variant="destructive" size="sm" className="max-lg:h-9 touch-hit" onClick={() => setDeleting(true)}>
                Delete
              </Button>
            }
          />
        </Group>
      )}
      {deleting && <DeleteProject org={org} slug={slug} onClose={() => setDeleting(false)} />}
    </>
  )
}

function NameForm({ org, slug, name, onDone }: { org: string; slug: string; name: string; onDone: () => void }) {
  const [value, setValue] = useState(name)
  const save = useChange(org, 'rename the project', () => projectActions.update(org, slug, { name: value.trim() }), { onDone })
  return (
    // The backend would take an empty name, so the form does not offer to send one.
    <InlineForm onSubmit={() => save.run()} onCancel={onDone} pending={save.pending} error={save.error} disabled={!value.trim() || value.trim() === name}>
      <Field label="Name" className="max-w-sm">
        {(field) => <Input {...field} autoFocus value={value} onChange={(event) => setValue(event.target.value)} maxLength={PROJECT_NAME_MAX} />}
      </Field>
    </InlineForm>
  )
}

function PlatformForm({ org, slug, name, platform, onDone }: { org: string; slug: string; name: string; platform?: string | null; onDone: () => void }) {
  const [value, setValue] = useState(platform ?? OTHER_PLATFORM)
  const save = useChange(org, 'change the platform', () => projectActions.update(org, slug, { name, platform: value === OTHER_PLATFORM ? null : value }), { onDone })
  // A platform set by another client that this list does not know stays choosable.
  const unknown = platform && !PLATFORMS.some((p) => p.id === platform)
  return (
    <InlineForm onSubmit={() => save.run()} onCancel={onDone} pending={save.pending} error={save.error} disabled={value === (platform ?? OTHER_PLATFORM)}>
      <Field label="Platform" className="max-w-sm">
        {(field) => (
          <Select {...field} autoFocus value={value} onChange={(event) => setValue(event.target.value)}>
            {unknown && <option value={platform}>{platform}</option>}
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </InlineForm>
  )
}

function TeamsForm({ org, slug, teams, onDone }: { org: string; slug: string; teams: string[]; onDone: () => void }) {
  const all = useQuery(teamsQuery(org)).data ?? []
  const projects = useQuery(projectsQuery(org)).data ?? []
  const [value, setValue] = useState(teams)
  const added = value.filter((team) => !teams.includes(team))
  const removed = teams.filter((team) => !value.includes(team))
  const save = useChange(
    org,
    'change the teams',
    async () => {
      for (const team of added) await projectActions.addTeam(org, slug, team)
      for (const team of removed) await projectActions.removeTeam(org, slug, team)
    },
    { onDone },
  )
  return (
    <InlineForm onSubmit={() => save.run()} onCancel={onDone} pending={save.pending} error={save.error} disabled={!added.length && !removed.length}>
      <TeamChecklist teams={all} projects={projects} value={value} onChange={setValue} className="max-w-sm" />
    </InlineForm>
  )
}

function ThrottleForm({ org, slug, name, rate, onDone }: { org: string; slug: string; name: string; rate: number; onDone: () => void }) {
  const [value, setValue] = useState(String(rate))
  const percent = Number(value)
  const valid = /^\d+$/.test(value.trim()) && percent <= 100
  const save = useChange(org, 'change how many events are dropped', () => projectActions.update(org, slug, { name, eventThrottleRate: percent }), { onDone })
  return (
    <InlineForm onSubmit={() => save.run()} onCancel={onDone} pending={save.pending} error={save.error} disabled={!valid || percent === rate}>
      <Field label="Percent of events to drop" className="max-w-56" error={value.trim() && !valid ? 'A whole number from 0 to 100.' : undefined}>
        {(field) => <Input {...field} autoFocus value={value} onChange={(event) => setValue(event.target.value)} inputMode="numeric" className="font-mono" />}
      </Field>
    </InlineForm>
  )
}

function DeleteProject({ org, slug, onClose }: { org: string; slug: string; onClose: () => void }) {
  const navigate = useNavigate()
  const remove = useChange(org, 'delete the project', () => projectActions.remove(org, slug), {
    gone: true,
    onDone: () => void navigate({ to: '/$org/settings', params: { org } }),
  })
  return (
    <DeleteDialog
      open
      onClose={onClose}
      what="project"
      name={slug}
      loses="Its issues, events, client keys and alerts are deleted for good."
      onDelete={() => remove.run()}
      pending={remove.pending}
      error={remove.error}
    />
  )
}

/* ---------- client keys ---------- */

const WINDOWS = [
  { seconds: 60, label: 'minute' },
  { seconds: 3600, label: 'hour' },
  { seconds: 86400, label: 'day' },
]

const rateLimitText = (key: ProjectKey) => {
  if (!key.rateLimit) return 'No limit'
  const window = WINDOWS.find((w) => w.seconds === key.rateLimit?.window)?.label ?? `${key.rateLimit.window}s`
  return `${key.rateLimit.count} / ${window}`
}

const keyName = (key: ProjectKey) => key.name || key.label || 'Unnamed key'

function Keys({ org, slug, keys, write }: { org: string; slug: string; keys?: ProjectKey[]; write: boolean }) {
  const row = useFold(keys?.length === 1 ? keys[0]!.id : undefined)
  // 'new', or the id of the key being edited.
  const [editing, setEditing] = useState<string>()
  const [deleting, setDeleting] = useState<ProjectKey>()
  const remove = useChange(org, 'delete the key', (key: ProjectKey) => projectActions.removeKey(org, slug, key.id), { onDone: () => setDeleting(undefined) })
  return (
    <>
      <Group
        label="Client keys"
        action={
          write && (
            <GroupAction onClick={() => setEditing('new')}>
              <Plus />
              New key
            </GroupAction>
          )
        }
      >
        {!keys && <RowSkeleton rows={2} />}
        {keys?.length === 0 && <Row label="No client keys" />}
        {keys?.map((key) => (
          <FoldRow key={key.id} label={keyName(key)} mono value={row.is(key.id) ? rateLimitText(key) : key.dsn.public} open={row.is(key.id)} onToggle={() => row.toggle(key.id)}>
            <Field label="DSN">{() => <CopyField value={key.dsn.public ?? ''} label={`DSN of ${keyName(key)}`} />}</Field>
            {key.dsn.security && <Field label="Security report address">{() => <CopyField value={key.dsn.security!} label="Security report address" />}</Field>}
            {write && (
              <div className="flex gap-2">
                <Button className="max-lg:h-11" onClick={() => setEditing(key.id)}>
                  Rename or limit
                </Button>
                <Button variant="destructive" className="max-lg:h-11" onClick={() => setDeleting(key)}>
                  Delete key
                </Button>
              </div>
            )}
          </FoldRow>
        ))}
      </Group>
      {editing && <KeyDialog org={org} slug={slug} keyItem={keys?.find((key) => key.id === editing)} onClose={() => setEditing(undefined)} />}
      <Confirm
        open={!!deleting}
        onClose={() => {
          setDeleting(undefined)
          remove.clear()
        }}
        title={`Delete ${deleting ? keyName(deleting) : 'key'}?`}
        confirm="Delete key"
        destructive
        onConfirm={() => deleting && remove.run(deleting)}
        pending={remove.pending}
        error={remove.error}
      >
        Anything still sending with this key's DSN stops being recorded.
      </Confirm>
    </>
  )
}

// Create or edit a client key: its name and how many events it accepts.
function KeyDialog({ org, slug, keyItem, onClose }: { org: string; slug: string; keyItem?: ProjectKey; onClose: () => void }) {
  const [name, setName] = useState(keyItem ? keyName(keyItem) : '')
  const [limited, setLimited] = useState(!!keyItem?.rateLimit)
  const [count, setCount] = useState(String(keyItem?.rateLimit?.count ?? 1000))
  const [window, setWindow] = useState(keyItem?.rateLimit?.window ?? 60)
  const [checked, setChecked] = useState(false)
  const countValid = /^[1-9]\d*$/.test(count.trim())
  const save = useChange(
    org,
    keyItem ? 'change the key' : 'create the key',
    () => {
      const body = { name: name.trim(), rateLimit: limited ? { count: Number(count), window } : null }
      return keyItem ? projectActions.updateKey(org, slug, keyItem.id, body) : projectActions.createKey(org, slug, body)
    },
    { onDone: onClose },
  )
  const submit = () => {
    setChecked(true)
    if (name.trim() && (!limited || countValid)) save.run()
  }
  // A window the backend holds that is not one of the three stays choosable.
  const windows = WINDOWS.some((w) => w.seconds === window) ? WINDOWS : [...WINDOWS, { seconds: window, label: `${window} seconds` }]
  return (
    <FormDialog open onClose={onClose} title={keyItem ? 'Client key' : 'New client key'} submit={keyItem ? 'Save' : 'Create key'} onSubmit={submit} pending={save.pending} error={save.error}>
      <Field label="Name" error={checked && !name.trim() ? 'Give the key a name.' : undefined}>
        {(field) => <Input {...field} autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={64} autoComplete="off" />}
      </Field>
      <Field label="Rate limit">
        {(field) => (
          <Select {...field} value={limited ? 'on' : 'off'} onChange={(event) => setLimited(event.target.value === 'on')}>
            <option value="off">No limit</option>
            <option value="on">Limit events</option>
          </Select>
        )}
      </Field>
      {limited && (
        <div className="flex items-start gap-2">
          <Field label="Events" className="flex-1" error={checked && !countValid ? 'A whole number above 0.' : undefined}>
            {(field) => <Input {...field} value={count} onChange={(event) => setCount(event.target.value)} inputMode="numeric" className="font-mono" />}
          </Field>
          <Field label="Per" className="flex-1">
            {(field) => (
              <Select {...field} value={window} onChange={(event) => setWindow(Number(event.target.value))}>
                {windows.map((w) => (
                  <option key={w.seconds} value={w.seconds}>
                    {w.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      )}
    </FormDialog>
  )
}

/* ---------- environments ---------- */

function Environments({ org, slug, environments, write }: { org: string; slug: string; environments?: ProjectEnvironment[]; write: boolean }) {
  const toggle = useChange(org, 'change the environment', ({ name, hidden }: { name: string; hidden: boolean }) => projectActions.setEnvironmentHidden(org, slug, name, hidden), { notice: true })
  if (!environments) return <RowSkeleton rows={3} />
  if (!environments.length) return <Screen title="No environments yet" />
  return (
    <section aria-label="Environments">
      <div className="flex h-9 items-center justify-between border-b bg-muted px-3 md:px-4 lg:h-8">
        <h2 className="label-caps">Environment</h2>
        <span className="label-caps">Shown</span>
      </div>
      {environments.map((environment) => (
        <div key={environment.name} className={ROW}>
          <span className={cn('mono min-w-0 flex-1 break-words', environment.isHidden && 'text-muted-foreground')}>{environment.name}</span>
          {write ? (
            <Switch
              aria-label={`Show ${environment.name}`}
              className="-mr-1"
              checked={!environment.isHidden}
              disabled={toggle.pending}
              onCheckedChange={(shown) => toggle.run({ name: environment.name, hidden: !shown })}
            />
          ) : (
            <span className="text-sm text-muted-foreground">{environment.isHidden ? 'No' : 'Yes'}</span>
          )}
        </div>
      ))}
    </section>
  )
}
