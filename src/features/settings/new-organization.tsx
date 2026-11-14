import { useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { ORGANIZATION_NAME_MAX, organizationActions } from '@/api/organizations'
import { stale } from '@/api/stale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTitle } from '@/lib/title'
import { useChange } from './change'
import { Field, FormError } from './parts'

export function NewOrganization() {
  useTitle('New organization')
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const create = useChange('create the organization', (value: string) => organizationActions.create(value), {
    stale: [stale.organizations()],
    // A new organization has nothing in it; its first project is the next thing to make.
    onDone: (organization) => void navigate({ to: '/$org/settings/projects/new', params: { org: organization.slug } }),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim() && !create.pending) create.run(name.trim())
  }
  return (
    <div className="flex flex-1 justify-center px-3 py-10 md:px-4 lg:py-16">
      <form noValidate onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-xl font-semibold">New organization</h1>
        <Field label="Name">
          {(field) => <Input {...field} autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={ORGANIZATION_NAME_MAX} autoComplete="organization" />}
        </Field>
        {create.error && <FormError>{create.error}</FormError>}
        <Button type="submit" variant="default" className="lg:self-start" disabled={!name.trim() || create.pending} aria-busy={create.pending}>
          Create organization
        </Button>
      </form>
    </div>
  )
}
