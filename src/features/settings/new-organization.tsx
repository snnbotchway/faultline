import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ORGANIZATION_NAME_MAX, organizationActions } from '@/api/organizations'
import { stale } from '@/api/stale'
import { Input } from '@/components/ui/input'
import { useChange } from './change'
import { Field } from '@/components/ui/field'
import { FormDialog } from './parts'
import { useT } from '@/i18n'

/**
 * A new organization is only its name, so it is made in a dialog over whatever page the user is on. A new one has
 * nothing in it, so it opens on its first project.
 */
export function NewOrganizationDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [checked, setChecked] = useState(false)
  const t = useT().settings
  const text = t.newOrganization
  const problem = !name.trim() ? text.needsName : undefined
  const create = useChange(text.action, (value: string) => organizationActions.create(value), {
    stale: [stale.organizations()],
    onDone: (organization) => void navigate({ to: '/$org/settings/projects/new', params: { org: organization.slug } }),
  })
  const submit = () => {
    setChecked(true)
    if (!problem) create.run(name.trim())
  }
  return (
    <FormDialog open onClose={onClose} title={text.title} submit={text.create} onSubmit={submit} pending={create.pending} error={create.error}>
      <Field label={t.name} error={checked ? problem : undefined}>
        {(field) => <Input {...field} autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={ORGANIZATION_NAME_MAX} autoComplete="organization" />}
      </Field>
    </FormDialog>
  )
}
