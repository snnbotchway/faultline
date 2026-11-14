import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { Scope, teamsQuery } from '@/api/organizations'
import { PROJECT_NAME_MAX, projectActions } from '@/api/projects'
import { TEAM_SLUG_MAX, teamActions } from '@/api/teams'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { useTitle } from '@/lib/title'
import { useAccess, useChange } from './access'
import { PlatformPicker, Snippets } from './fields'
import { Field, FormError, SettingsBar } from './parts'
import { DSN_PLACEHOLDER, OTHER_PLATFORM, platformName } from './platforms'
import { ProjectTab } from './project-tabs'
import { teamSlugError } from './team-slug'

/**
 * A project needs a name, a platform and the team that gets it. The code for the chosen platform shows beside
 * the choices, so the user sees what they will paste before they commit.
 */
export function NewProject({ org }: { org: string }) {
  useTitle('New project', org)
  const can = useAccess(org)
  const navigate = useNavigate()
  const teams = useQuery(teamsQuery(org)).data
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState(OTHER_PLATFORM)
  const [team, setTeam] = useState<string>()
  // An organization without a team gets its first one here, since a project cannot exist outside a team.
  const [newTeam, setNewTeam] = useState('')
  const [checked, setChecked] = useState(false)
  const firstTeam = teams?.length === 0
  const teamError = firstTeam ? teamSlugError(newTeam, []) : undefined

  const create = useChange(
    org,
    'create the project',
    async () => {
      const slug = firstTeam ? (await teamActions.create(org, newTeam.trim())).slug : (team ?? teams![0]!.slug)
      return projectActions.create(org, slug, { name: name.trim(), platform: platform === OTHER_PLATFORM ? null : platform })
    },
    { onDone: (project) => void navigate({ to: '/$org/settings/projects/$project', params: { org, project: project.slug ?? '' }, search: { tab: ProjectTab.setup } }) },
  )
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setChecked(true)
    if (name.trim() && !teamError && teams && !create.pending) create.run()
  }

  if (teams && !can(Scope.projectWrite))
    return (
      <>
        <SettingsBar org={org} title="New project" />
        <Screen title="You can't create projects here">
          <p className="prose-text text-muted-foreground">Ask an admin of this organization.</p>
        </Screen>
      </>
    )

  return (
    <>
      <SettingsBar org={org} title="New project" />
      <form noValidate onSubmit={submit} className="mx-auto grid w-full max-w-6xl flex-1 content-start lg:grid-cols-[26rem_minmax(0,1fr)] lg:border-x">
        <div className="flex flex-col gap-4 p-3 md:p-4 lg:border-r">
          <Field label="Project name" error={checked && !name.trim() ? 'Give the project a name.' : undefined}>
            {(field) => <Input {...field} autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={PROJECT_NAME_MAX} autoComplete="off" />}
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Platform</span>
            <PlatformPicker value={platform} onChange={setPlatform} />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3 border-y p-3 md:p-4 lg:row-span-2 lg:border-y-0">
          <h2 className="flex min-h-8 items-center text-lg font-semibold">{platformName(platform)}</h2>
          <Snippets platform={platform} dsn={DSN_PLACEHOLDER} />
        </div>
        <div className="flex flex-col gap-4 p-3 md:p-4 lg:border-r lg:pt-0">
          {firstTeam ? (
            <Field label="Team" error={checked ? teamError : undefined}>
              {(field) => (
                <Input {...field} value={newTeam} onChange={(event) => setNewTeam(event.target.value)} maxLength={TEAM_SLUG_MAX} placeholder="backend" className="font-mono" autoComplete="off" autoCapitalize="off" spellCheck={false} />
              )}
            </Field>
          ) : (
            <Field label="Team">
              {(field) => (
                <Select {...field} value={team ?? teams?.[0]?.slug ?? ''} onChange={(event) => setTeam(event.target.value)} disabled={!teams}>
                  {teams?.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      #{t.slug}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          {create.error && <FormError>{create.error}</FormError>}
          <Button type="submit" variant="default" className="max-lg:h-11 lg:self-start" disabled={!teams || create.pending} aria-busy={create.pending}>
            Create project
          </Button>
        </div>
      </form>
    </>
  )
}
