import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Globe, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MonitorSort, STATUS_PAGE_ADMIN_URL, monitorActions, monitorKeys, monitorListQuery, statusPageUrl, statusPagesQuery, type StatusPage } from '@/api/monitors'
import { currentUserQuery } from '@/api/organizations'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, SubmitButton } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { failed } from '@/lib/notice'
import { useTitle } from '@/lib/title'
import { span } from './format'
import { FLAPPING_WINDOW, Health, healthOf } from './health'
import { UptimeTab } from './address'
import { HEALTH, HEALTH_ORDER } from './describe'
import { HealthGlyph, UptimeTabs } from './parts'
import { useMonitorHealth } from './use-health'
import { CopyButton } from '@/features/settings/parts'

// A row's action as a plain word (DESIGN.md, Rows), above the row's own link so it can be tapped on its own.
const ADMIN_LINK = 'relative z-10 flex min-h-8 shrink-0 cursor-pointer items-center gap-1 text-sm font-medium hover:underline max-lg:min-h-11'

/**
 * The organization's status pages and the monitors on each. The backend can create a page but not
 * change one; its monitors and who can see it are changed in the backend's admin, which only a
 * superuser can open, so only a superuser is shown the way there.
 */
export function StatusPages({ org }: { org: string }) {
  useTitle('Status pages', 'Uptime')
  const pages = useQuery(statusPagesQuery(org))
  const list = useInfiniteQuery(monitorListQuery(org, MonitorSort.name))
  const monitors = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data])
  // Only a superuser can put monitors on a page (in the backend's admin), so a page made by anyone else would stay empty.
  const canAdmin = useQuery(currentUserQuery).data?.isSuperuser === true
  const [creating, setCreating] = useState(false)
  const [opened] = useState(Date.now)
  const now = pages.dataUpdatedAt || opened
  // Read from each monitor's checks, as the monitor list reads it, so the two never disagree.
  const health = useMonitorHealth(org, monitors, now, FLAPPING_WINDOW)
  const healthOfMonitor = (monitor: StatusPage['monitors'][number]) => (monitor.id == null ? undefined : health.get(monitor.id)?.report.health) ?? healthOf(monitor, [], [], now).health

  const bar = (
    <PageBar>
      <h1 className="sr-only">Status pages</h1>
      <UptimeTabs org={org} current={UptimeTab.statusPages} counts={{ [UptimeTab.statusPages]: pages.data?.length }} />
      {canAdmin && (
        <Button variant="default" size="bar" className="ml-auto" onClick={() => setCreating(true)}>
          New status page
        </Button>
      )}
    </PageBar>
  )
  const dialog = creating && <NewStatusPage org={org} onClose={() => setCreating(false)} />

  if (pages.isError)
    return (
      <>
        {bar}
        <Screen title="The status pages didn't load">
          <Button onClick={() => void pages.refetch()}>Try again</Button>
        </Screen>
      </>
    )
  if (pages.isSuccess && pages.data.length === 0)
    return (
      <>
        {bar}
        <Screen title="Make a status page to show others which services are up">
          {canAdmin && (
            <Button variant="default" onClick={() => setCreating(true)}>
              New status page
            </Button>
          )}
        </Screen>
        {dialog}
      </>
    )

  return (
    <>
      {bar}
      {pages.isPending ? (
        <div aria-busy aria-label="Loading status pages">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2 border-b px-3 py-3 lg:px-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : (
        <ul>
          {pages.data.map((page) => {
            const onPage = page.monitors
              .map((monitor) => ({ monitor, health: healthOfMonitor(monitor) }))
              .sort((a, b) => HEALTH_ORDER.indexOf(a.health) - HEALTH_ORDER.indexOf(b.health))
            const Visibility = page.isPublic ? Globe : Lock
            const url = statusPageUrl(org, page.slug ?? '')
            return (
              <li key={page.slug} className="relative grid gap-x-6 gap-y-1 border-b px-3 py-3 transition-colors duration-100 hover:bg-accent/60 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_auto] lg:items-center lg:px-4 lg:py-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-medium">
                    {/* The whole row opens the page; this link's box is stretched over it. */}
                    <a href={url} target="_blank" rel="noreferrer" className="truncate after:absolute after:inset-0 after:content-['']">
                      {page.name}
                    </a>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-normal text-muted-foreground">
                      <Visibility className="size-3" />
                      {page.isPublic ? 'Public' : 'Members'}
                    </span>
                    <ExternalLink className="size-3 shrink-0 text-muted-foreground" aria-label="Opens in a new tab" />
                  </h2>
                  <p className="flex min-w-0 items-center gap-3">
                    <span className="mono truncate text-muted-foreground">{url}</span>
                    <CopyButton text={url} label="Copy link" variant="ghost" size="bar" className="relative z-10 shrink-0" />
                  </p>
                </div>
                <ul className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1">
                  {onPage.length === 0 && (
                    <li className="flex items-center gap-3 text-muted-foreground">
                      {canAdmin ? (
                        <>
                          No monitors yet
                          <a href={STATUS_PAGE_ADMIN_URL} target="_blank" rel="noreferrer" className={ADMIN_LINK}>
                            Add monitors
                          </a>
                        </>
                      ) : (
                        'An admin adds monitors to this page.'
                      )}
                    </li>
                  )}
                  {onPage.map(({ monitor, health }) => (
                    <li key={monitor.id} className="flex items-center gap-2">
                      <HealthGlyph health={health} />
                      {monitor.name}
                      {health !== Health.up && (
                        <span className={HEALTH[health].color}>
                          {health === Health.down && monitor.lastChange ? (
                            <>
                              down <span className="mono">{span(now - Date.parse(monitor.lastChange))}</span>
                            </>
                          ) : (
                            HEALTH[health].label.toLowerCase()
                          )}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {canAdmin && (
                  <a href={STATUS_PAGE_ADMIN_URL} target="_blank" rel="noreferrer" className={ADMIN_LINK}>
                    Edit page
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {dialog}
    </>
  )
}

function NewStatusPage({ org, onClose }: { org: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [tried, setTried] = useState(false)
  const create = useMutation({
    mutationFn: () => monitorActions.createStatusPage(org, { name: name.trim(), isPublic }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: monitorKeys.statusPages(org) })
      onClose()
    },
    onError: (error) => failed(error, 'create the status page'),
  })
  return (
    <TaskDialog open onClose={onClose} title="New status page">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          setTried(true)
          if (name.trim()) create.mutate()
        }}
      >
        <Field label="Name" error={tried && !name.trim() ? 'Give the page a name.' : undefined}>
          {(props) => <Input {...props} value={name} onChange={(event) => setName(event.target.value)} />}
        </Field>
        <label className="flex min-h-9 cursor-pointer items-center gap-3 max-lg:min-h-11">
          <Checkbox checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked === true)} />
          Anyone with the link can see it
        </label>
        <TaskActions className="sm:justify-end">
          <SubmitButton busy={create.isPending} className="sm:order-last">
            Create status page
          </SubmitButton>
          <Button onClick={onClose}>Cancel</Button>
        </TaskActions>
      </form>
    </TaskDialog>
  )
}
