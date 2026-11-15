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
import { messages, useT, type Messages } from '@/i18n'
import { failed, notify } from '@/lib/notice'
import { withScheme } from '@/lib/url'
import { cn } from '@/lib/utils'
import { every, everyPhrase } from './format'
import { DAY, HOUR, MINUTE } from '@/lib/time'

// The kinds a monitor can be made as, or switched between. An SSL monitor keeps its kind.
const TYPES: { value: MonitorType; label: (text: Messages['uptime']['dialog']['types']) => string; icon: LucideIcon }[] = [
  { value: MonitorType.get, label: () => 'GET', icon: Globe },
  { value: MonitorType.post, label: () => 'POST', icon: Send },
  { value: MonitorType.ping, label: (text) => text.ping, icon: Radio },
  { value: MonitorType.port, label: (text) => text.port, icon: Plug },
  { value: MonitorType.heartbeat, label: (text) => text.heartbeat, icon: HeartPulse },
]
const INTERVALS = [MINUTE, 2 * MINUTE, 5 * MINUTE, 15 * MINUTE, HOUR, DAY]
const THRESHOLDS = [1, 2, 3, 5]
const MAX_TIMEOUT = 60
const DEFAULT_TIMEOUT = 20

const isOffered = (type: string) => TYPES.some((offered) => offered.value === type)
const ADDRESS: Partial<Record<MonitorType, { kind: keyof Messages['uptime']['dialog']['address']; placeholder: string }>> = {
  [MonitorType.get]: { kind: 'url', placeholder: 'https://example.com/health' },
  [MonitorType.post]: { kind: 'url', placeholder: 'https://example.com/health' },
  [MonitorType.ping]: { kind: 'host', placeholder: 'example.com' },
  [MonitorType.port]: { kind: 'hostPort', placeholder: 'db.example.com:5432' },
  [MonitorType.ssl]: { kind: 'url', placeholder: 'https://example.com' },
}

// HTTP and SSL checks take a whole address; ping and port take a host without a scheme.
const addressFor = (type: MonitorType, url: string) => (isHttp(type) || type === MonitorType.ssl ? withScheme(url) : url.replace(/^\w+:\/\//, ''))

// The choices with the monitor's current value among them, when it was set to one the list lacks.
const withCurrent = (choices: number[], current: number) => (choices.includes(current) ? choices : [...choices, current].sort((a, b) => a - b))

type Draft = { name: string; type: MonitorType; url: string; status: string; body: string; interval: number; timeout: string; threshold: number; project?: string; environment: string }

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
  // A new monitor joins the first project until the user picks (`undefined`), so its downtime can alert someone.
  project: monitor ? (monitor.projectID ?? '') : undefined,
  environment: monitor?.environmentID ? String(monitor.environmentID) : '',
})

const whole = (text: string, min: number, max: number) => /^\d+$/.test(text.trim()) && Number(text) >= min && Number(text) <= max

function validate(draft: Draft, text: Messages['uptime']['dialog']): Partial<Record<'name' | 'url' | 'status' | 'timeout', string>> {
  const errors: Partial<Record<'name' | 'url' | 'status' | 'timeout', string>> = {}
  if (!draft.name.trim()) errors.name = text.nameMissing
  const url = draft.url.trim()
  if (draft.type !== MonitorType.heartbeat && !url) errors.url = text.address[ADDRESS[draft.type]!.kind].missing
  else if (draft.type === MonitorType.port && !/^[^\s:/]+:\d{1,5}$/.test(url.replace(/^\w+:\/\//, ''))) errors.url = text.hostPortExample
  if (isHttp(draft.type) && !whole(draft.status, 100, 599)) errors.status = text.statusExample
  if (draft.type !== MonitorType.heartbeat && !whole(draft.timeout, 1, MAX_TIMEOUT)) errors.timeout = text.timeoutRange(MAX_TIMEOUT)
  return errors
}

// The backend's refusals of an address, in the user's words.
function addressError(error: unknown): string | undefined {
  const refused = messages().uptime.dialog.refused
  switch (monitorRefusal(error)) {
    case MonitorRefusal.privateAddress:
      return refused.privateAddress
    case MonitorRefusal.badAddress:
      return refused.badAddress
    case MonitorRefusal.badPort:
      return refused.badPort
    default:
      return undefined
  }
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
  const { uptime: t, common } = useT()
  const text = t.dialog
  const [draft, setDraft] = useState(() => draftFrom(monitor))
  const [tried, setTried] = useState(false)
  const [created, setCreated] = useState<Monitor>()
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const projects = useQuery(projectsQuery(org)).data
  const project = draft.project ?? projects?.[0]?.id ?? ''
  const slug = projects?.find((candidate) => candidate.id === project)?.slug
  // A hidden environment is offered only to the monitor that already uses it.
  const environments = useQuery({ ...projectEnvironmentsQuery(org, slug ?? ''), enabled: !!slug }).data?.filter(
    (environment) => !environment.isHidden || String(environment.id) === draft.environment,
  )
  const heartbeat = draft.type === MonitorType.heartbeat
  const errors = validate(draft, text)
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
        project: project || null,
        environmentID: project && draft.environment ? Number(draft.environment) : null,
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
      if (monitorRefusal(error) === MonitorRefusal.limit) notify(text.limit, true)
      else failed(error, text.saveAction)
    },
  })
  const refused = addressError(save.error)

  return (
    <TaskDialog
      open
      onClose={() => (created ? onCreated(created) : onClose())}
      title={created ? text.ready(created.name) : monitor ? text.edit(monitor.name) : t.newMonitor}
      quietFocus={!!monitor || !!created}
      className="sm:max-w-2xl"
    >
      {created ? (
        <>
          <div className="mb-4 flex flex-col gap-3">
            <p>{text.callEvery(everyPhrase(created.interval))}</p>
            <CopyField value={created.heartbeatEndpoint ?? ''} label={t.page.heartbeatAddress} />
          </div>
          <TaskActions className="sm:justify-end">
            <Button variant="default" onClick={() => onCreated(created)}>
              {text.openMonitor}
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
          <Group label={text.groups.check}>
            {!isOffered(draft.type) ? (
              <p className="flex min-h-9 items-center gap-3">
                <span className="mono font-semibold">{draft.type}</span>
                <span className="text-muted-foreground">{text.byApi}</span>
              </p>
            ) : (
              <div role="radiogroup" aria-label={text.type} className="grid grid-cols-5 border bg-card">
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
                    {type.label(text.types)}
                  </button>
                ))}
              </div>
            )}
            {heartbeat ? (
              monitor?.heartbeatEndpoint && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{text.addressToCall}</span>
                  <CopyField value={monitor.heartbeatEndpoint} label={t.page.heartbeatAddress} />
                </div>
              )
            ) : (
              <Field label={text.address[ADDRESS[draft.type]!.kind].label} error={shown('url') ?? refused}>
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
            <Field label={text.name} error={shown('name')}>
              {(props) => <Input {...props} value={draft.name} onChange={(event) => set('name', event.target.value)} />}
            </Field>
          </Group>
          {isHttp(draft.type) && (
            <Group label={text.groups.expect}>
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                <Field label={text.status} error={shown('status')}>
                  {(props) => <Input {...props} inputMode="numeric" className="font-mono" value={draft.status} onChange={(event) => set('status', event.target.value)} />}
                </Field>
                <Field label={text.pageContains}>{(props) => <Input {...props} value={draft.body} onChange={(event) => set('body', event.target.value)} />}</Field>
              </div>
            </Group>
          )}
          <Group label={text.groups.schedule}>
            <div className={cn('grid gap-3', heartbeat ? 'grid-cols-1 sm:max-w-48' : 'grid-cols-2 sm:grid-cols-3')}>
              <Field label={heartbeat ? text.heartbeatEveryLabel : text.every}>
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
                  <Field label={text.timeoutSeconds} error={shown('timeout')}>
                    {(props) => <Input {...props} inputMode="numeric" className="font-mono" value={draft.timeout} onChange={(event) => set('timeout', event.target.value)} />}
                  </Field>
                  <Field label={text.downAfter}>
                    {(props) => (
                      <Select {...props} value={draft.threshold} onChange={(event) => set('threshold', Number(event.target.value))}>
                        {withCurrent(THRESHOLDS, draft.threshold).map((count) => (
                          <option key={count} value={count}>
                            {t.page.failedCount(count)}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </>
              )}
            </div>
          </Group>
          <Group label={text.groups.belongsTo}>
            <div className="grid grid-cols-2 gap-3">
              <Field label={common.project}>
                {(props) => (
                  // Slugs are machine text; "None (no alerts)" is words.
                  <Select {...props} className={cn(project && 'font-mono')} value={project} onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value, environment: '' }))}>
                    <option value="">{text.noProject}</option>
                    {projects?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.slug}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label={text.environment}>
                {(props) => (
                  <Select {...props} className={cn(draft.environment && 'font-mono')} value={draft.environment} disabled={!project} onChange={(event) => set('environment', event.target.value)}>
                    <option value="">{common.allEnvironments}</option>
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
              {monitor ? text.saveMonitor : text.createMonitor}
            </SubmitButton>
            <Button onClick={onClose}>{common.cancel}</Button>
          </TaskActions>
        </form>
      )}
    </TaskDialog>
  )
}
