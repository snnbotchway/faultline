import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { projectAlertsQuery } from '@/api/alerts'
import { Scope, projectsQuery, teamsQuery } from '@/api/organizations'
import { stale } from '@/api/stale'
import {
  PROJECT_NAME_MAX,
  projectActions,
  projectEnvironmentsQuery,
  projectKeysQuery,
  projectQuery,
  type ProjectDetail,
  type ProjectEnvironment,
  type ProjectKey,
} from '@/api/projects'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { RowButton } from '@/components/ui/row-button'
import { Input, Select } from '@/components/ui/input'
import { useTitle } from '@/lib/title'
import { useAccess } from './access'
import { useChange } from './change'
import { TeamChecklist } from './fields'
import { Field } from '@/components/ui/field'
import { DeleteDialog, FoldRow, Group, InlineForm, LinkRow, Row, RowSkeleton, SettingsBar, Sheet, Tabs } from './parts'
import { teamList } from './labels'
import { useFold } from './rows'
import { PLATFORMS, platformLabel, platformName, shownPlatform, storedPlatform } from './platforms'
import { ProjectSetup } from './project-setup'
import { Environments } from './project-environments'
import { Keys } from './project-keys'
import { ProjectTab } from './project-tabs'
import { ProjectAlerts } from '@/features/alerts/project-alerts'
import type { AlertParam } from '@/features/alerts/open-rule'
import { isNotFound } from '@/api/errors'
import { messages, percent, useT, type Messages } from '@/i18n'

/**
 * One project's settings. Until its first event arrives the page opens on the set-up step; after that on General.
 * Each tab has an address (`?tab=`), the stock one, so links from old emails land on the right tab.
 */
export function ProjectPage({ org, slug, tab, alert }: { org: string; slug: string; tab?: ProjectTab; alert?: AlertParam }) {
  const t = useT().settings
  useTitle(slug, t.title)
  const can = useAccess(org)
  const navigate = useNavigate()
  const project = useQuery(projectQuery(org, slug))
  // The detail carries no teams; the organization's list does.
  const listed = useQuery(projectsQuery(org)).data?.find((p) => p.slug === slug)
  const keys = useQuery(projectKeysQuery(org, slug)).data
  const environments = useQuery(projectEnvironmentsQuery(org, slug)).data
  const rules = useQuery(projectAlertsQuery(org, slug)).data

  const opening = project.data && !project.data.firstEvent ? ProjectTab.setup : ProjectTab.general
  const current = tab ?? opening
  // The tab the page opened on goes into the address, so the set-up step stays put when the first event arrives.
  useEffect(() => {
    if (!tab && project.data) void navigate({ to: '/$org/settings/projects/$project', params: { org, project: slug }, search: { tab: opening }, replace: true })
  }, [tab, project.data, opening, navigate, org, slug])

  if (isNotFound(project.error))
    return (
      <>
        <SettingsBar org={org} title={slug} mono />
        <Screen title={t.project.noSuch}>
          <Button asChild>
            <Link to="/$org/settings" params={{ org }}>
              {t.project.back}
            </Link>
          </Button>
        </Screen>
      </>
    )

  const openRule = (rule?: AlertParam) =>
    void navigate({ to: '/$org/settings/projects/$project', params: { org, project: slug }, search: rule ? { tab: ProjectTab.alerts, alert: rule } : { tab: ProjectTab.alerts } })
  const context: TabContext = { org, slug, can, keys, environments, teams: listed?.teams.map((team) => team.slug), rules: rules?.length, alert, openRule }
  const panel = PROJECT_TABS.find((entry) => entry.value === current)

  return (
    <>
      <SettingsBar org={org} title={slug} mono>
        {project.data?.firstEvent && (
          <Button asChild size="bar">
            <Link to="/$org/issues" params={{ org }} search={{ project: [Number(project.data.id)] }}>
              {t.project.issues}
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
              label={t.project.tabsLabel}
              tabs={PROJECT_TABS.map((entry) => ({ value: entry.value, label: t.project.tabs[entry.name], count: entry.count?.(context) }))}
              current={current}
              link={(value) => ({ to: '/$org/settings/projects/$project', params: { org, project: slug }, search: { tab: value } })}
            />
            {panel?.render({ ...context, project: project.data })}
          </>
        )}
      </Sheet>
    </>
  )
}

type TabContext = {
  org: string
  slug: string
  can: (scope: Scope) => boolean
  keys?: ProjectKey[]
  environments?: ProjectEnvironment[]
  teams?: string[]
  rules?: number
  // The alert rule whose editor is open on the Alerts tab, and how to open another or close it.
  alert?: AlertParam
  openRule: (alert?: AlertParam) => void
}

// The project page's tabs, in order.
const PROJECT_TABS: { value: ProjectTab; name: keyof Messages['settings']['project']['tabs']; count?: (context: TabContext) => number | undefined; render: (context: TabContext & { project: ProjectDetail }) => ReactNode }[] = [
  {
    value: ProjectTab.setup,
    name: 'setup',
    render: ({ org, project, keys, can }) => <ProjectSetup org={org} project={project} dsn={keys?.[0]?.dsn.public} keysLoaded={!!keys} write={can(Scope.projectWrite)} />,
  },
  {
    value: ProjectTab.general,
    name: 'general',
    render: ({ org, project, teams, can }) => (
      <General org={org} project={project} teams={teams} write={can(Scope.projectWrite)} admin={can(Scope.projectAdmin)} linkTeams={can(Scope.orgWrite)} />
    ),
  },
  {
    value: ProjectTab.keys,
    name: 'keys',
    count: ({ keys }) => keys?.length,
    render: ({ org, slug, keys, can }) => <Keys org={org} slug={slug} keys={keys} write={can(Scope.projectWrite)} admin={can(Scope.projectAdmin)} />,
  },
  {
    value: ProjectTab.environments,
    name: 'environments',
    count: ({ environments }) => environments?.length,
    render: ({ org, slug, environments, can }) => <Environments org={org} slug={slug} environments={environments} write={can(Scope.projectWrite)} />,
  },
  {
    value: ProjectTab.alerts,
    name: 'alerts',
    count: ({ rules }) => rules,
    render: ({ org, slug, alert, openRule }) => <ProjectAlerts org={org} slug={slug} alert={alert} onOpen={openRule} />,
  },
]

/* ---------- general ---------- */

// The rows of General that unfold to be changed.
const GeneralField = { name: 'name', platform: 'platform', teams: 'teams', throttle: 'throttle' } as const
type GeneralField = (typeof GeneralField)[keyof typeof GeneralField]

// `linkTeams`: giving a team access to the project, or taking it away, is for managers and owners.
function General({ org, project, teams, write, admin, linkTeams }: { org: string; project: ProjectDetail; teams?: string[]; write: boolean; admin: boolean; linkTeams: boolean }) {
  const slug = project.slug ?? ''
  const row = useFold()
  const [deleting, setDeleting] = useState(false)
  const edit = (field: GeneralField) => (write ? () => row.toggle(field) : undefined)
  const { settings: t, common } = useT()
  const text = t.project
  return (
    <>
      <Group label={text.general}>
        <FoldRow label={t.name} value={project.name} open={row.is(GeneralField.name)} onToggle={edit(GeneralField.name)}>
          <NameForm org={org} slug={slug} name={project.name} onDone={row.close} />
        </FoldRow>
        <FoldRow label={text.platform} value={platformName(project.platform)} open={row.is(GeneralField.platform)} onToggle={edit(GeneralField.platform)}>
          <PlatformForm org={org} slug={slug} name={project.name} platform={project.platform} onDone={row.close} />
        </FoldRow>
        <FoldRow
          label={text.teamsWithAccess}
          mono={!!teams?.length}
          value={teams && (teams.length ? teamList(teams) : common.noneFeminine)}
          open={row.is(GeneralField.teams)}
          onToggle={teams && linkTeams ? () => row.toggle(GeneralField.teams) : undefined}
        >
          {teams && <TeamsForm org={org} slug={slug} teams={teams} onDone={row.close} />}
        </FoldRow>
        <FoldRow label={text.eventsToDrop} mono value={percent(project.eventThrottleRate)} open={row.is(GeneralField.throttle)} onToggle={edit(GeneralField.throttle)}>
          <ThrottleForm org={org} slug={slug} name={project.name} rate={project.eventThrottleRate} onDone={row.close} />
        </FoldRow>
      </Group>
      <Group label={text.you}>
        {/* Someone who manages the project through their organization role sees no team of theirs above. */}
        {write && !project.isMember && <Row label={text.yourAccess} value={text.throughRole} />}
        <LinkRow label={text.yourNotifications} value={text.alertsFromProject} to="/profile/notifications" />
      </Group>
      {admin && (
        <Group label={t.danger}>
          <Row
            label={text.deleteProject}
            action={
              <RowButton danger onClick={() => setDeleting(true)}>
                {common.delete}
              </RowButton>
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
  const t = useT().settings
  const save = useChange(t.project.renameAction, () => projectActions.update(org, slug, { name: value.trim() }), { stale: [stale.projects(org)], onDone })
  return (
    // The backend would take an empty name, so the form does not offer to send one.
    <InlineForm onSubmit={() => save.run()} onCancel={onDone} pending={save.pending} error={save.error} disabled={!value.trim() || value.trim() === name}>
      <Input aria-label={t.name} className="max-w-sm" autoFocus value={value} onChange={(event) => setValue(event.target.value)} maxLength={PROJECT_NAME_MAX} />
    </InlineForm>
  )
}

function PlatformForm({ org, slug, name, platform, onDone }: { org: string; slug: string; name: string; platform?: string | null; onDone: () => void }) {
  const [value, setValue] = useState(shownPlatform(platform))
  const t = useT().settings.project
  const save = useChange(t.platformAction, () => projectActions.update(org, slug, { name, platform: storedPlatform(value) }), { stale: [stale.projects(org)], onDone })
  // A platform set by another client that this list does not know stays choosable.
  const unknown = platform && !PLATFORMS.some((p) => p.id === platform)
  return (
    <InlineForm onSubmit={() => save.run()} onCancel={onDone} pending={save.pending} error={save.error} disabled={value === shownPlatform(platform)}>
      <Select aria-label={t.platform} className="max-w-sm" autoFocus value={value} onChange={(event) => setValue(event.target.value)}>
        {unknown && <option value={platform}>{platform}</option>}
        {PLATFORMS.map((p) => (
          <option key={p.id} value={p.id}>
            {platformLabel(p)}
          </option>
        ))}
      </Select>
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
    messages().settings.project.teamsAction,
    async () => {
      for (const team of added) await projectActions.addTeam(org, slug, team)
      for (const team of removed) await projectActions.removeTeam(org, slug, team)
    },
    { stale: [stale.projects(org), stale.teams(org)], onDone },
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
  const t = useT().settings.project
  const save = useChange(t.throttleAction, () => projectActions.update(org, slug, { name, eventThrottleRate: percent }), { stale: [stale.projects(org)], onDone })
  return (
    <InlineForm onSubmit={() => save.run()} onCancel={onDone} pending={save.pending} error={save.error} disabled={!valid || percent === rate}>
      <Field label={t.percentToDrop} className="max-w-56" error={value.trim() && !valid ? t.wholeNumber : undefined}>
        {(field) => <Input {...field} autoFocus value={value} onChange={(event) => setValue(event.target.value)} inputMode="numeric" className="font-mono" />}
      </Field>
    </InlineForm>
  )
}

function DeleteProject({ org, slug, onClose }: { org: string; slug: string; onClose: () => void }) {
  const navigate = useNavigate()
  const t = useT().settings
  const remove = useChange(t.project.deleteAction, () => projectActions.remove(org, slug), {
    // The project's environments and issues go with it.
    stale: [stale.projects(org), stale.teams(org), stale.environments(org), stale.issueLists(org)],
    leavesPage: true,
    onDone: () => void navigate({ to: '/$org/settings', params: { org } }),
  })
  return (
    <DeleteDialog
      open
      onClose={onClose}
      title={t.deleteProjectTitle(slug)}
      submit={t.project.deleteProject}
      name={slug}
      loses={t.project.loses}
      onDelete={() => remove.run()}
      pending={remove.pending}
      error={remove.error}
    />
  )
}
