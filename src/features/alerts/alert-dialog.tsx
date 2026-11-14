import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { RecipientType, TestStatus, alertActions, alertKeys, toRecipientInput, type Alert, type AlertInput, type RecipientInput } from '@/api/alerts'
import { projectEnvironmentsQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogBar, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Select } from '@/components/ui/input'
import { ALL_ENVIRONMENTS } from '@/lib/format'
import { failed, notify } from '@/lib/notice'
import { cn } from '@/lib/utils'
import { recipientMeta } from './recipient-kinds'
import { AddRecipient, RecipientTag } from './recipients'

const MAX_EVENTS = 10_000
const DEFAULT_EVENTS = 10
const DEFAULT_MINUTES = 5

const wholeIn = (text: string, max: number) => /^\d+$/.test(text.trim()) && Number(text) >= 1 && Number(text) <= max

type Draft = { name: string; project: string; events: boolean; quantity: string; minutes: string; down: boolean; environments: string[]; recipients: { key: number; recipient: RecipientInput }[] }

let nextKey = 0
const keyed = (recipient: RecipientInput) => ({ key: ++nextKey, recipient })

function draftFrom(rule: Alert | undefined, project: string): Draft {
  return {
    name: rule?.name ?? '',
    project,
    events: rule ? Boolean(rule.quantity && rule.timespanMinutes) : true,
    quantity: String(rule?.quantity || DEFAULT_EVENTS),
    minutes: String(rule?.timespanMinutes || DEFAULT_MINUTES),
    down: rule?.uptime ?? false,
    environments: rule?.environments ?? [],
    // A new rule starts by emailing the project's members.
    recipients: (rule?.alertRecipients.map(toRecipientInput) ?? [{ recipientType: RecipientType.email, url: '' }]).map(keyed),
  }
}

/**
 * Create or change one alert rule: when it fires, who it notifies and in which environments. A saved
 * rule can also send a test to its saved recipients. `projects` lets a new rule pick its project; a
 * saved rule stays in its own, as the backend has no way to move one.
 */
export function AlertDialog({ org, project, rule, projects, canDelete, onClose }: { org: string; project: string; rule?: Alert; projects?: string[]; canDelete: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(() => draftFrom(rule, project))
  const [tried, setTried] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const environments = useQuery(projectEnvironmentsQuery(org, draft.project)).data?.filter((environment) => !environment.isHidden || draft.environments.includes(environment.name))
  const refresh = (slug: string) => void queryClient.invalidateQueries({ queryKey: alertKeys.project(org, slug) })

  const errors = {
    name: !draft.name.trim() ? 'Give the rule a name.' : undefined,
    quantity: draft.events && !wholeIn(draft.quantity, MAX_EVENTS) ? `From 1 to ${MAX_EVENTS}.` : undefined,
    minutes: draft.events && !wholeIn(draft.minutes, Number.MAX_SAFE_INTEGER) ? 'At least 1.' : undefined,
    when: !draft.events && !draft.down ? 'Pick at least one.' : undefined,
  }
  const shown = (error: string | undefined) => (tried ? error : undefined)

  const save = useMutation({
    mutationFn: () => {
      const body: AlertInput = {
        name: draft.name.trim(),
        quantity: draft.events ? Number(draft.quantity) : null,
        timespanMinutes: draft.events ? Number(draft.minutes) : null,
        uptime: draft.down,
        environments: draft.environments,
        alertRecipients: draft.recipients.map((entry) => entry.recipient),
      }
      return rule?.id ? alertActions.update(org, project, rule.id, body) : alertActions.create(org, draft.project, body)
    },
    onSuccess: () => {
      refresh(draft.project)
      onClose()
    },
    onError: (error) => failed(error, 'save the rule'),
  })
  const remove = useMutation({
    mutationFn: () => alertActions.remove(org, project, rule!.id!),
    onSuccess: () => {
      refresh(project)
      onClose()
    },
    onError: (error) => failed(error, 'delete the rule'),
  })
  // Email is never tested, so the test goes to the other recipients the rule has saved.
  const testable = (rule?.alertRecipients ?? []).filter((recipient) => recipient.recipientType !== RecipientType.email)
  const test = useMutation({
    mutationFn: () => alertActions.test(org, project, rule!.id!),
    onSuccess: (results) => {
      const broken = results.filter((result) => result.status === TestStatus.error).map((result) => recipientMeta(result).label)
      if (broken.length) notify(`Couldn't reach ${[...new Set(broken)].join(', ')}. Check the address, then try again.`, true)
      else notify(`Test sent to ${results.filter((result) => result.status === TestStatus.sent).length}`)
    },
    onError: (error) => failed(error, 'send the test'),
  })

  const submit = () => {
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
    save.mutate()
  }
  const toggleEnvironment = (name: string) =>
    set('environments', draft.environments.includes(name) ? draft.environments.filter((value) => value !== name) : [...draft.environments, name])
  const chip = (on: boolean) => cn('mono h-8 cursor-pointer border px-3 max-lg:h-11', on ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-accent')

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent tall aria-describedby={undefined} onOpenAutoFocus={(event) => event.preventDefault()} className="max-w-xl">
        <DialogBar title={rule ? 'Edit rule' : 'New rule'} />
        <form
          noValidate
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="flex min-h-0 flex-col gap-5 overflow-x-hidden overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" error={shown(errors.name)}>
                {(props) => <Input {...props} value={draft.name} onChange={(event) => set('name', event.target.value)} />}
              </Field>
              <Field label="Project">
                {(props) => (
                  <Select
                    {...props}
                    value={draft.project}
                    disabled={!projects || !!rule}
                    onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value, environments: [] }))}
                    className="font-mono"
                  >
                    {(rule || !projects ? [project] : projects).map((slug) => (
                      <option key={slug}>{slug}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-medium">Alert when</legend>
              <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 border-y py-2">
                <Checkbox checked={draft.events} onCheckedChange={(checked) => set('events', checked === true)} aria-label="An issue gets many events" />
                <span>an issue gets</span>
                <Input
                  aria-label="Events"
                  aria-invalid={!!shown(errors.quantity)}
                  inputMode="numeric"
                  disabled={!draft.events}
                  value={draft.quantity}
                  onChange={(event) => set('quantity', event.target.value)}
                  className="h-8 w-16 shrink-0 px-1 text-center font-mono max-lg:h-11"
                />
                <span>events in</span>
                <Input
                  aria-label="Minutes"
                  aria-invalid={!!shown(errors.minutes)}
                  inputMode="numeric"
                  disabled={!draft.events}
                  value={draft.minutes}
                  onChange={(event) => set('minutes', event.target.value)}
                  className="h-8 w-16 shrink-0 px-1 text-center font-mono max-lg:h-11"
                />
                <span>minutes</span>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 border-b">
                <Checkbox checked={draft.down} onCheckedChange={(checked) => set('down', checked === true)} />a monitor goes down
              </label>
              {tried && (errors.when ?? errors.quantity ?? errors.minutes) && <p className="mt-2 text-sm text-destructive">{errors.when ?? (errors.quantity ? `Events: ${errors.quantity}` : `Minutes: ${errors.minutes}`)}</p>}
            </fieldset>

            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-medium">Notifies</legend>
              <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {draft.recipients.map((entry) => (
                  <RecipientTag key={entry.key} recipient={entry.recipient} onRemove={() => set('recipients', draft.recipients.filter((other) => other.key !== entry.key))} />
                ))}
                <li>
                  <AddRecipient
                    hasEmail={draft.recipients.some((entry) => entry.recipient.recipientType === RecipientType.email)}
                    onAdd={(recipient) => setDraft((current) => ({ ...current, recipients: [...current.recipients, keyed(recipient)] }))}
                  />
                </li>
              </ul>
            </fieldset>

            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-medium">Environments</legend>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" aria-pressed={draft.environments.length === 0} onClick={() => set('environments', [])} className={chip(draft.environments.length === 0)}>
                  {ALL_ENVIRONMENTS}
                </button>
                {environments?.map((environment) => (
                  <button key={environment.name} type="button" aria-pressed={draft.environments.includes(environment.name)} onClick={() => toggleEnvironment(environment.name)} className={chip(draft.environments.includes(environment.name))}>
                    {environment.name}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t p-3">
            {rule && canDelete && (
              <Button variant="destructive" className="max-lg:h-11" aria-busy={remove.isPending} disabled={remove.isPending} onClick={() => setDeleting(true)}>
                Delete
              </Button>
            )}
            <span className="flex-1" />
            {rule && testable.length > 0 && (
              <Button className="max-lg:h-11" aria-busy={test.isPending} disabled={test.isPending} onClick={() => test.mutate()}>
                Send test to {testable.length}
              </Button>
            )}
            {!rule && (
              <Button className="max-lg:h-11" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="default" className="max-lg:h-11" aria-busy={save.isPending} disabled={save.isPending}>
              {rule ? 'Save rule' : 'Create rule'}
            </Button>
          </div>
        </form>
        {rule && (
          <ConfirmDialog
            open={deleting}
            destructive
            title={rule.name ? `Delete “${rule.name}”?` : 'Delete this rule?'}
            detail="Nobody is told when it would have fired."
            confirm="Delete rule"
            onConfirm={() => remove.mutate()}
            onClose={() => setDeleting(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
