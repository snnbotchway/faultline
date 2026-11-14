// THROWAWAY PROTOTYPE. The stock paths the prototype answers, and the few screens whose content no variant disputes.
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mark } from '@/components/mark'
import { INSTANCE } from './data'
import { Field, PLink, useGo, useProto } from './kit'

export type Screen =
  | { kind: 'home' }
  | { kind: 'newOrg' }
  | { kind: 'systemInfo' }
  | { kind: 'orgProjects'; org: string }
  | { kind: 'org'; org: string }
  | { kind: 'signIn'; org: string }
  | { kind: 'newProject'; org: string }
  | { kind: 'project'; org: string; slug: string }
  | { kind: 'teams'; org: string }
  | { kind: 'team'; org: string; team: string; tab: 'members' | 'projects' | 'settings' }
  | { kind: 'members'; org: string }
  | { kind: 'invite'; org: string }
  | { kind: 'member'; org: string; id: string }

// Same paths as the stock UI (docs/parity.md). `sign-in` is new: stock has no screen for it.
export function parse(path: string): Screen | undefined {
  const parts = path.split('/').filter(Boolean)
  const [org, area, section, item, tab] = parts
  if (parts.length === 0) return { kind: 'home' }
  if (path === 'organizations/new') return { kind: 'newOrg' }
  if (path === 'system-info') return { kind: 'systemInfo' }
  if (!org) return undefined
  if (area === 'projects' && !section) return { kind: 'orgProjects', org }
  if (area !== 'settings') return undefined
  if (!section) return { kind: 'org', org }
  if (section === 'sign-in') return { kind: 'signIn', org }
  if (section === 'projects') {
    if (!item) return { kind: 'orgProjects', org }
    return item === 'new' ? { kind: 'newProject', org } : { kind: 'project', org, slug: item }
  }
  if (section === 'teams') {
    if (!item) return { kind: 'teams', org }
    return { kind: 'team', org, team: item, tab: tab === 'projects' || tab === 'settings' ? tab : 'members' }
  }
  if (section === 'members') {
    if (!item) return { kind: 'members', org }
    return item === 'new' ? { kind: 'invite', org } : { kind: 'member', org, id: item }
  }
  return undefined
}

export function NewOrganization() {
  const go = useGo()
  const [name, setName] = useState('')
  return (
    <form
      className="flex w-full max-w-sm flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        go('/demo-co/settings/projects/new')
      }}
    >
      <h1 className="text-2xl font-semibold">New organization</h1>
      <Field label="Name">
        <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={200} />
      </Field>
      <Button type="submit" variant="default" className="self-start max-lg:h-11 max-lg:self-stretch" disabled={!name.trim()}>
        Create organization
      </Button>
    </form>
  )
}

const yesNo = (value: boolean) => (value ? 'Open' : 'Closed')

export function SystemInfo() {
  const rows = [
    ['Version', INSTANCE.version],
    ['Instance', INSTANCE.glitchtipInstanceName],
    ['Server time zone', INSTANCE.serverTimeZone],
    ['Sign-up', yesNo(INSTANCE.enableUserRegistration)],
    ['New organizations', yesNo(INSTANCE.enableOrganizationCreation)],
  ]
  return (
    <dl className="w-full max-w-xl border-t">
      {rows.map(([label, value]) => (
        <div key={label} className="flex min-h-10 items-center justify-between gap-4 border-b py-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="mono">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function SignInApps() {
  const { can } = useProto()
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Mark className="size-7 text-muted-foreground" />
      <h1 className="text-xl font-semibold">No sign-in apps yet</h1>
      {can('org:admin') && <Button variant="default">Add sign-in app</Button>}
    </div>
  )
}

export function NotFoundScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
      <Mark className="size-7 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Not in this prototype</h1>
      <Button asChild>
        <PLink to="/">Go to projects</PLink>
      </Button>
    </div>
  )
}
