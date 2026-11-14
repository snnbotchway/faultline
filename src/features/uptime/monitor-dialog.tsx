import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HeartPulse, Globe, Plug, Radio, Send, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { MonitorRefusal, MonitorType, isHttp, monitorActions, monitorKeys, monitorRefusal, type Monitor, type MonitorDetail, type MonitorInput } from '@/api/monitors'
import { projectsQuery } from '@/api/organizations'
import { projectEnvironmentsQuery } from '@/api/projects'
import { Button } from '@/components/ui/button'
import { CopyField } from '@/features/settings/parts'
import { Field, SubmitButton } from '@/components/ui/field'
import { Input, Select } from '@/components/ui/input'
import { TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { failed, notify } from '@/lib/notice'
import { ALL_ENVIRONMENTS } from '@/lib/format'
import { withScheme } from '@/lib/url'
import { cn } from '@/lib/utils'
import { every } from './format'

// The kinds a monitor can be made as, or switched between. An SSL monitor keeps its kind.
const TYPES: { value: MonitorType; label: string; icon: LucideIcon }[] = [
  { value: MonitorType.get, label: 'GET', icon: Globe },
  { value: MonitorType.post, label: 'POST', icon: Send },
  { value: MonitorType.ping, label: 'Ping', icon: Radio },
  { value: MonitorType.port, label: 'Port', icon: Plug },
  { value: MonitorType.heartbeat, label: 'Heartbeat', icon: HeartPulse },
]
const INTERVALS = [60, 120, 300, 900, 3600, 86_400]
const THRESHOLDS = [1, 2, 3, 5]
const MAX_TIMEOUT = 60
const DEFAULT_TIMEOUT = 20

const isOffered = (type: string) => TYPES.some((offered) => offered.value === type)
const ADDRESS: Partial<Record<MonitorType, { label: string; noun: string; placeholder: string }>> = {
  [MonitorType.get]: { label: 'URL', noun: 'URL', placeholder: 'https://example.com/health' },
  [MonitorType.post]: { label: 'URL', noun: 'URL', placeholder: 'https://example.com/health' },
  [MonitorType.ping]: { label: 'Host', noun: 'host', placeholder: 'example.com' },
  [MonitorType.port]: { label: 'Host and port', noun: 'host and port', placeholder: 'db.example.com:5432' },
  [MonitorType.ssl]: { label: 'URL', noun: 'URL', placeholder: 'https://example.com' },
}

// HTTP and SSL checks take a whole address; ping and port take a host without a scheme.
const addressFor = (type: MonitorType, url: string) => (isHttp(type) || type === MonitorType.ssl ? withScheme(url) : url.replace(/^\w+:\/\//, ''))

// The choices with the monitor's current value among them, when it was set to one the list lacks.
const withCurrent = (choices: number[], current: number) => (choices.includes(current) ? choices : [...choices, current].sort((a, b) => a - b))

type Draft = { name: string; type: MonitorType; url: string; status: string; body: string; interval: number; timeout: string; threshold: number; project: string; environment: string }

const draftFrom = (monitor?: MonitorDetail): Draft => ({
  name: monitor?.name ?? '',
  // A saved monitor keeps its kind, including one the type picker does not offer.
  type: (monitor?.monitorType as MonitorType | undefined) ?? MonitorType.get,
  url: monitor?.url ?? '',
  status: String(monitor?.expectedStatus ?? 200),
  body: monitor?.expectedBody ?? '',
  interval: monitor?.interval ?? 60,
  timeout: String(monitor?.timeout ?? DEFAULT_TIMEOUT),
  threshold: monitor?.confirmationThreshold ?? 1,
  project: monitor?.projectID ?? '',
  environment: monitor?.environmentID ? String(monitor.environmentID) : '',
})

const whole = (text: string, min: number, max: number) => /^\d+$/.test(text.trim()) && Number(text) >= min && Number(text) <= max

function validate(draft: Draft): Partial<Record<'name' | 'url' | 'status' | 'timeout', string>> {
  const errors: Partial<Record<'name' | 'url' | 'status' | 'timeout', string>> = {}
  if (!draft.name.trim()) errors.name = 'Give the monitor a name.'
  const url = draft.url.trim()
  if (draft.type !== MonitorType.heartbeat && !url) errors.url = `Enter the ${ADDRESS[draft.type]!.noun} to check.`
  else if (draft.type === MonitorType.port && !/^[^\s:/]+:\d{1,5}$/.test(url.replace(/^\w+:\/\//, ''))) errors.url = 'Enter a host and port, such as db.example.com:5432.'
  if (isHttp(draft.type) && !whole(draft.status, 100, 599)) errors.status = 'A status code, such as 200.'
  if (draft.type !== MonitorType.heartbeat && !whole(draft.timeout, 1, MAX_TIMEOUT)) errors.timeout = `From 1 to ${MAX_TIMEOUT}.`
  return errors
}

// The backend's refusals of an address, in the user's words.
const ADDRESS_REFUSED: Partial<Record<MonitorRefusal, string>> = {
  [MonitorRefusal.privateAddress]: 'This address is on a private network. Monitors can only check public addresses.',
  [MonitorRefusal.badAddress]: 'Enter a full address, such as https://example.com/health.',
  [MonitorRefusal.badPort]: 'Enter a host and port, such as db.example.com:5432.',
}
function addressError(error: unknown): string | undefined {
  const refusal = monitorRefusal(error)
  return refusal && ADDRESS_REFUSED[refusal]
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="grid gap-x-5 gap-y-3 border-b py-4 first:pt-0 last:border-b-0 sm:grid-cols-[96px_minmax(0,1fr)]">
      <span className="label-caps sm:pt-1">{label}</span>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </div>
  )
}

/**
 * Add a monitor, or change one. A heartbeat's address is made by the backend, so after creating one
 * the dialog shows it to copy instead of closing.
 */
export function MonitorDialog({ org, monitor, onClose, onCreated }: { org: string; monitor?: MonitorDetail; onClose: () => void; onCreated: (monitor: Monitor) => void }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(() => draftFrom(monitor))
  const [tried, setTried] = useState(false)
  const [created, setCreated] = useState<Monitor>()
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const projects = useQuery(projectsQuery(org)).data
  const slug = projects?.find((project) => project.id === draft.project)?.slug
  // A hidden environment is offered only to the monitor that already uses it.
  const environments = useQuery({ ...projectEnvironmentsQuery(org, slug ?? ''), enabled: !!slug }).data?.filter(
    (environment) => !environment.isHidden || String(environment.id) === draft.environment,
  )
  const heartbeat = draft.type === MonitorType.heartbeat
  const errors = validate(draft)
  const shown = (key: keyof typeof errors) => (tried ? errors[key] : undefined)

  const save = useMutation({
    mutationFn: () => {
      const url = draft.url.trim()
      const body: MonitorInput = {
        name: draft.name.trim(),
        monitorType: draft.type,
        url: heartbeat ? '' : addressFor(draft.type, url),
        expectedStatus: isHttp(draft.type) ? Number(draft.status) : null,
        expectedBody: isHttp(draft.type) ? draft.body : '',
        interval: draft.interval,
        timeout: heartbeat ? null : Number(draft.timeout),
        confirmationThreshold: heartbeat ? 1 : draft.threshold,
        project: draft.project || null,
        environmentID: draft.project && draft.environment ? Number(draft.environment) : null,
      }
      return monitor?.id ? monitorActions.update(org, monitor.id, body) : monitorActions.create(org, body)
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: monitorKeys.all(org) })
      if (monitor) onClose()
      else if (saved.monitorType === MonitorType.heartbeat) setCreated(saved)
      else onCreated(saved)
    },
    onError: (error) => {
      if (addressError(error)) return
      if (monitorRefusal(error) === MonitorRefusal.limit) notify('This organization has as many monitors as it may have. Delete one to add another.', true)
      else failed(error, 'save the monitor')
    },
  })
  const refused = addressError(save.error)

  return (
    <TaskDialog
      open
      onClose={() => (created ? onCreated(created) : onClose())}
      title={created ? `${created.name} is ready` : monitor ? `Edit ${monitor.name}` : 'New monitor'}
      quietFocus={!!monitor || !!created}
      className="sm:max-w-2xl"
    >
      {created ? (
        <>
          <div className="mb-4 flex flex-col gap-3">
            <p>Call this address every {every(created.interval)}.</p>
            <CopyField value={created.heartbeatEndpoint ?? ''} label="Heartbeat address" />
          </div>
          <TaskActions className="sm:justify-end">
            <Button variant="default" onClick={() => onCreated(created)}>
              Open monitor
            </Button>
          </TaskActions>
        </>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            setTried(true)
            if (Object.keys(errors).length === 0) save.mutate()
          }}
        >
          <Group label="Check">
            {!isOffered(draft.type) ? (
              <p className="flex min-h-9 items-center gap-3">
                <span className="mono font-semibold">{draft.type}</span>
                <span className="text-muted-foreground">This kind of check is set up through the API and can't be changed here.</span>
              </p>
            ) : (
              <div role="radiogroup" aria-label="Type" className="grid grid-cols-5 border bg-card">
                {TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    role="radio"
                    aria-checked={draft.type === type.value}
                    onClick={() => set('type', type.value)}
                    className={cn(
                      'flex h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 border-r text-sm font-medium -outline-offset-2 last:border-r-0',
                      draft.type === type.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <type.icon className="size-4" />
                    {type.label}
                  </button>
                ))}
              </div>
            )}
            {heartbeat ? (
              monitor?.heartbeatEndpoint && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Address to call</span>
                  <CopyField value={monitor.heartbeatEndpoint} label="Heartbeat address" />
                </div>
              )
            ) : (
              <Field label={ADDRESS[draft.type]!.label} error={shown('url') ?? refused}>
                {(props) => (
                  <Input
                    {...props}
                    className="font-mono"
                    inputMode="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={draft.url}
                    placeholder={ADDRESS[draft.type]!.placeholder}
                    onChange={(event) => {
                      set('url', event.target.value)
                      save.reset()
                    }}
                  />
                )}
              </Field>
            )}
            <Field label="Name" error={shown('name')}>
              {(props) => <Input {...props} value={draft.name} onChange={(event) => set('name', event.target.value)} />}
            </Field>
          </Group>
          {isHttp(draft.type) && (
            <Group label="Expect">
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                <Field label="Status" error={shown('status')}>
                  {(props) => <Input {...props} inputMode="numeric" className="font-mono" value={draft.status} onChange={(event) => set('status', event.target.value)} />}
                </Field>
                <Field label="Page contains">{(props) => <Input {...props} value={draft.body} onChange={(event) => set('body', event.target.value)} />}</Field>
              </div>
            </Group>
          )}
          <Group label="Schedule">
            <div className={cn('grid gap-3', heartbeat ? 'grid-cols-1 sm:max-w-48' : 'grid-cols-2 sm:grid-cols-3')}>
              <Field label={heartbeat ? 'A heartbeat every' : 'Every'}>
                {(props) => (
                  <Select {...props} value={draft.interval} onChange={(event) => set('interval', Number(event.target.value))}>
                    {withCurrent(INTERVALS, draft.interval).map((seconds) => (
                      <option key={seconds} value={seconds}>
                        {every(seconds)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              {!heartbeat && (
                <>
                  <Field label="Timeout (seconds)" error={shown('timeout')}>
                    {(props) => <Input {...props} inputMode="numeric" className="font-mono" value={draft.timeout} onChange={(event) => set('timeout', event.target.value)} />}
                  </Field>
                  <Field label="Down after">
                    {(props) => (
                      <Select {...props} value={draft.threshold} onChange={(event) => set('threshold', Number(event.target.value))}>
                        {withCurrent(THRESHOLDS, draft.threshold).map((count) => (
                          <option key={count} value={count}>
                            {count} failed
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </>
              )}
            </div>
          </Group>
          <Group label="Belongs to">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Project">
                {(props) => (
                  <Select {...props} className="font-mono" value={draft.project} onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value, environment: '' }))}>
                    <option value="">None</option>
                    {projects?.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.slug}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Environment">
                {(props) => (
                  <Select {...props} className="font-mono" value={draft.environment} disabled={!draft.project} onChange={(event) => set('environment', event.target.value)}>
                    <option value="">{ALL_ENVIRONMENTS}</option>
                    {environments?.map((environment) => (
                      <option key={environment.id} value={environment.id ?? ''}>
                        {environment.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </Group>
          <TaskActions className="mt-4 sm:justify-end">
            <SubmitButton busy={save.isPending} className="sm:order-last">
              {monitor ? 'Save monitor' : 'Create monitor'}
            </SubmitButton>
            <Button onClick={onClose}>Cancel</Button>
          </TaskActions>
        </form>
      )}
    </TaskDialog>
  )
}
