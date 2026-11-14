import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsRight, Ellipsis } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ApiError } from '@/api/client'
import { IssueStatus, StatsPeriod, issueEventQuery, issueQuery, issueStatsQuery, issueTagsQuery, rawEventUrl, type IssueDetail } from '@/api/issues'
import { canAdminEvents, canWriteEvents, organizationQuery } from '@/api/organizations'
import { recentReleasesQuery } from '@/api/releases'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { useCommands, type Command } from '@/components/shell/commands'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { Skeleton } from '@/components/ui/skeleton'
import { useHotkeys } from '@/lib/hotkeys'
import { notify } from '@/lib/notice'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { oneIssue, useIssueActions } from './actions'
import { AssignDialog, AssigneeBadge } from './assignee'
import { DeleteIssuesDialog } from './dialogs'
import { errorParts, exceptionsOf, messageOf } from './event'
import { ago, compact, exact } from './format'
import { Comments, ContextRail, Fingerprints, RequestSection, Section, TagsRail, Timeline, UserReports } from './issue-sections'
import { LevelGlyph } from './level'
import { StackTrace } from './stack-trace'
import { STATUS, isStatus, statusActions } from './status'
import { PeriodToggle, ReleaseTrace } from './trace'
import { axisFor, axisStartLabel, fillBuckets, periodInfo, releaseMarks } from './trend'

function Chart({ org, issueId }: { org: string; issueId: string }) {
  const [period, setPeriod] = useState<StatsPeriod>(StatsPeriod.fortnight)
  const stats = useQuery(issueStatsQuery(org, [issueId], period))
  const releases = useQuery(recentReleasesQuery(org)).data
  const axis = useMemo(() => axisFor(period, new Date(stats.dataUpdatedAt)), [period, stats.dataUpdatedAt])
  const buckets = fillBuckets(stats.data?.[0]?.stats[period], axis)
  const marks = releaseMarks(releases ?? [], axis)
  const { unit, now } = periodInfo(period)
  return (
    <div>
      <div className="mb-1 flex items-center gap-3">
        <h2 className="label-caps font-semibold text-foreground">Events / {unit}</h2>
        <span className="mono text-muted-foreground">
          peak {compact(Math.max(...buckets, 0))}/{unit}
        </span>
        <div className="ml-auto">
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>
      </div>
      {stats.isPending ? (
        <Skeleton className="mt-5 h-10 lg:h-16" />
      ) : (
        <>
          <ReleaseTrace buckets={buckets} marks={marks} height={40} className="lg:hidden" />
          <ReleaseTrace buckets={buckets} marks={marks} height={64} className="max-lg:hidden" />
        </>
      )}
      <div className="label-caps mt-1 flex justify-between">
        <span>{axisStartLabel(period, axis.start)}</span>
        <span>{now}</span>
      </div>
    </div>
  )
}

function Fact({ label, value, detail, title }: { label: string; value: string; detail?: string; title?: string }) {
  return (
    <div className="min-w-0" title={title}>
      <dt className="label-caps">{label}</dt>
      <dd className="mono mt-0.5 truncate">
        <span className="text-lg font-semibold lg:text-xl">{value}</span>
        {detail && <span className="text-muted-foreground max-lg:block lg:ml-2">{detail}</span>}
      </dd>
    </div>
  )
}

function statusLabel(issue: IssueDetail) {
  if (issue.status === IssueStatus.resolved && issue.statusDetails?.inNextRelease) return 'Resolved in next release'
  return isStatus(issue.status) ? STATUS[issue.status].label : issue.status
}

export function IssuePage({ org, issueId, eventId }: { org: string; issueId: string; eventId?: string }) {
  const navigate = useNavigate()
  const issue = useQuery(issueQuery(org, issueId))
  const event = useQuery(issueEventQuery(org, issueId, eventId))
  // The backend keeps no user count per issue; the distinct values of the user tag are the people affected.
  const tags = useQuery(issueTagsQuery(org, issueId)).data
  const users = (tags?.find((tag) => tag.key === 'user.id') ?? tags?.find((tag) => tag.key === 'user.email'))?.uniqueValues
  const access = useQuery(organizationQuery(org)).data?.access
  const canWrite = canWriteEvents(access)
  const canAdmin = canAdminEvents(access)
  const actions = useIssueActions(org)
  const [assigning, setAssigning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  useTitle(issue.data?.shortId ?? 'Issue')

  const data = issue.data
  const status = data?.status
  const target = oneIssue(issueId)
  const offered = status && isStatus(status) ? statusActions(status) : []
  const setStatus = (next: IssueStatus) => canWrite && void actions.setStatus(target, next)
  const toEvent = (id: string | null | undefined) =>
    id && void navigate({ to: '/$org/issues/$issueId/events/$eventId', params: { org, issueId, eventId: id } })
  const older = event.data?.previousEventID
  const newer = event.data?.nextEventID
  const rawUrl = event.data ? rawEventUrl(org, issueId, event.data.id) : undefined
  const copyLink = () => void navigator.clipboard.writeText(`${window.location.origin}/${org}/issues/${issueId}`).then(() => notify('Link copied'))

  useHotkeys({
    ...Object.fromEntries(offered.map((action) => [action.key, () => setStatus(action.status)])),
    a: () => canWrite && setAssigning(true),
    '[': () => toEvent(older),
    ']': () => toEvent(newer),
  })

  const commands: Command[] = [
    ...(canWrite
      ? [
          ...offered.map((action) => ({ id: `issue:${action.status}`, group: 'issue', label: action.action, keys: action.key, run: () => setStatus(action.status) })),
          ...(status === IssueStatus.unresolved
            ? [{ id: 'issue:next-release', group: 'issue', label: 'Resolve in next release', run: () => void actions.resolveInNextRelease(target) }]
            : []),
          { id: 'issue:assign', group: 'issue', label: 'Assign', keys: 'a', run: () => setAssigning(true) },
        ]
      : []),
    ...(older ? [{ id: 'issue:older', group: 'issue', label: 'Older event', keys: '[', run: () => toEvent(older) }] : []),
    ...(newer ? [{ id: 'issue:newer', group: 'issue', label: 'Newer event', keys: ']', run: () => toEvent(newer) }] : []),
    { id: 'issue:copy', group: 'issue', label: 'Copy link', run: copyLink },
    ...(rawUrl ? [{ id: 'issue:json', group: 'issue', label: 'Open raw event', run: () => void window.open(rawUrl, '_blank') }] : []),
    ...(canWrite ? [{ id: 'issue:delete', group: 'issue', label: 'Delete issue', run: () => setDeleting(true) }] : []),
  ]
  useCommands(data ? commands : [])

  const bar = (
    <PageBar>
      <Link to="/$org/issues" params={{ org }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Issues
      </Link>
      {data && (
        <>
          <span className="text-muted-foreground">/</span>
          <span className="mono font-semibold">{data.shortId}</span>
          <span className={cn('label-caps', data.status === IssueStatus.resolved && 'text-ok')}>{statusLabel(data)}</span>
        </>
      )}
      {data && (
        <div className="ml-auto flex items-center gap-1.5">
          {canWrite && (
            <div className="flex items-center gap-1.5 max-lg:hidden">
              {offered[0] && (
                <span className="flex">
                  <Button size="sm" variant="default" onClick={() => setStatus(offered[0]!.status)}>
                    {offered[0].action}
                    <Kbd>{offered[0].key}</Kbd>
                  </Button>
                  {status === IssueStatus.unresolved && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="default" className="border-l-primary-foreground/30" aria-label="More ways to resolve">
                          <ChevronDown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => void actions.resolveInNextRelease(target)}>Resolve in next release</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </span>
              )}
              {offered.slice(1).map((action) => (
                <Button key={action.status} size="sm" onClick={() => setStatus(action.status)}>
                  {action.action}
                  <Kbd>{action.key}</Kbd>
                </Button>
              ))}
              <Button size="sm" onClick={() => setAssigning(true)}>
                <AssigneeBadge assignee={data.assignedTo} />
                {data.assignedTo ? data.assignedTo.name : 'Assign'}
                <Kbd>a</Kbd>
              </Button>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="max-lg:size-11" aria-label="More">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={copyLink}>Copy link</DropdownMenuItem>
              {rawUrl && (
                <DropdownMenuItem asChild>
                  <a href={rawUrl} target="_blank" rel="noreferrer">
                    Raw event
                  </a>
                </DropdownMenuItem>
              )}
              {canWrite && status === IssueStatus.unresolved && (
                <DropdownMenuItem className="lg:hidden" onSelect={() => void actions.resolveInNextRelease(target)}>
                  Resolve in next release
                </DropdownMenuItem>
              )}
              {canWrite && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={() => setDeleting(true)}>
                    Delete issue
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </PageBar>
  )

  if (issue.isError) {
    const missing = issue.error instanceof ApiError && issue.error.status === 404
    return (
      <>
        {bar}
        <Screen title={missing ? 'Issue not found' : "This issue didn't load"}>
          {missing ? (
            <Button asChild>
              <Link to="/$org/issues" params={{ org }}>
                Go to issues
              </Link>
            </Button>
          ) : (
            <Button onClick={() => void issue.refetch()}>Try again</Button>
          )}
        </Screen>
      </>
    )
  }
  if (!data) {
    return (
      <>
        {bar}
        <div className="space-y-4 p-4" aria-busy aria-label="Loading issue">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      </>
    )
  }

  const { type, text } = errorParts(data)
  const exceptions = event.data ? exceptionsOf(event.data) : []
  const message = event.data && messageOf(event.data)

  return (
    <>
      {bar}
      <div className="grid gap-x-10 gap-y-4 border-b px-3 py-4 md:px-4 lg:grid-cols-[minmax(0,1fr)_440px] lg:py-5">
        <div className="min-w-0">
          <h1 className="flex items-baseline gap-2.5 text-xl leading-snug font-semibold lg:text-2xl">
            <LevelGlyph level={data.level} className="size-3 translate-y-[-1px]" />
            <span className="min-w-0 break-words">
              {type && <span className="font-mono text-[0.9em]">{type} </span>}
              <span className={cn(type && 'font-medium')}>{text}</span>
            </span>
          </h1>
          {data.culprit && <p className="mono mt-1 truncate pl-[22px] text-muted-foreground">{data.culprit}</p>}
          <dl className="mt-4 flex gap-x-5 lg:mt-5 lg:flex lg:gap-x-10 lg:pl-[22px]">
            <Fact label="Events" value={compact(data.count)} />
            {users !== undefined && <Fact label="Users" value={compact(users)} />}
            <Fact label="First seen" value={ago(data.firstSeen)} detail={data.firstRelease?.shortVersion} title={exact(data.firstSeen)} />
            <Fact label="Last seen" value={ago(data.lastSeen)} detail={data.lastRelease?.shortVersion} title={exact(data.lastSeen)} />
          </dl>
        </div>
        <Chart org={org} issueId={issueId} />
      </div>

      <div className="grid gap-x-10 px-3 py-4 md:px-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:py-5">
        <div className="min-w-0 space-y-7 max-lg:pb-6">
          {event.isPending ? (
            <Skeleton className="h-72" />
          ) : event.isError || !event.data ? (
            <p className="text-muted-foreground">This event didn't load.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b pb-2">
                <span className="label-caps font-semibold text-foreground">Event</span>
                <span className="mono truncate" title={event.data.eventID}>
                  {event.data.eventID.slice(0, 8)}
                </span>
                <time className="mono truncate text-muted-foreground" dateTime={event.data.dateCreated}>
                  {exact(event.data.dateCreated)}
                </time>
                <div className="ml-auto flex shrink-0 items-center">
                  <Button variant="ghost" size="icon-sm" className="max-lg:size-11" disabled={!older} onClick={() => toEvent(older)} aria-label="Older event">
                    <ChevronLeft />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="max-lg:size-11" disabled={!newer} onClick={() => toEvent(newer)} aria-label="Newer event">
                    <ChevronRight />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="max-lg:size-11" disabled={!newer} asChild={!!newer} aria-label="Latest event">
                    {newer ? (
                      <Link to="/$org/issues/$issueId" params={{ org, issueId }} aria-label="Latest event">
                        <ChevronsRight />
                      </Link>
                    ) : (
                      <ChevronsRight />
                    )}
                  </Button>
                  {rawUrl && (
                    <a href={rawUrl} target="_blank" rel="noreferrer" className="mono ml-1 px-1.5 text-muted-foreground underline hover:text-foreground max-lg:hidden">
                      json
                    </a>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-7">
                <div className="max-lg:order-2">
                  <Timeline event={event.data} title={data.title} />
                </div>
                {exceptions.length > 0 ? (
                  <Section title="Stack trace">
                    <StackTrace exceptions={exceptions} />
                  </Section>
                ) : (
                  message && (
                    <Section title="Message">
                      <pre className="mono overflow-x-auto border bg-code p-3 whitespace-pre-wrap">{message.formatted ?? message.message}</pre>
                    </Section>
                  )
                )}
                <div className="order-3 empty:hidden">
                  <RequestSection event={event.data} />
                </div>
              </div>
            </>
          )}
          <Comments org={org} issueId={issueId} canManage={canAdmin} />
          {(data.userReportCount ?? 0) > 0 && <UserReports org={org} issueId={issueId} />}
          {canAdmin && <Fingerprints org={org} issueId={issueId} />}
        </div>
        <aside className="space-y-6 max-lg:border-t max-lg:pt-5 lg:border-l lg:pl-6">
          <TagsRail org={org} issueId={issueId} />
          {event.data && <ContextRail event={event.data} />}
        </aside>
      </div>

      {canWrite && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center gap-1.5 border-t bg-card px-3 pb-[env(safe-area-inset-bottom)] lg:hidden">
          {offered.slice(0, 2).map((action, index) => (
            <Button key={action.status} size="touch" variant={index === 0 ? 'default' : 'outline'} className="flex-1" onClick={() => setStatus(action.status)}>
              {action.action}
            </Button>
          ))}
          <Button size="touch" className="flex-1" onClick={() => setAssigning(true)}>
            <AssigneeBadge assignee={data.assignedTo} />
            Assign
          </Button>
        </div>
      )}

      <AssignDialog org={org} open={assigning} current={data.assignedTo} onClose={() => setAssigning(false)} onPick={(assignee) => void actions.assign(target, assignee)} />
      <DeleteIssuesDialog
        open={deleting}
        what={data.shortId}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          if (await actions.remove(target)) void navigate({ to: '/$org/issues', params: { org } })
        }}
      />
    </>
  )
}
