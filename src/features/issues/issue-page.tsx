import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsRight, Copy, Ellipsis } from 'lucide-react'
import { useMemo, useState } from 'react'
import { IssueStatus, StatsPeriod, TagKey, issueEventQuery, issueQuery, issueStatsQuery, issueTagsQuery, rawEventUrl, type IssueDetail } from '@/api/issues'
import { canAdminEvents, canWriteEvents, instanceSettingsQuery, organizationQuery } from '@/api/organizations'
import { recentReleasesQuery } from '@/api/releases'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { CommandGroup, useCommands, type Command } from '@/components/shell/commands'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useHotkeys } from '@/lib/hotkeys'
import { failed, notify } from '@/lib/notice'
import { releaseName } from '@/lib/text'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { oneIssue, useIssueActions } from './actions'
import { AssignDialog, AssigneeBadge } from './assignee'
import { Comments } from './comments'
import { copyForAi } from './copy-for-ai'
import { DeleteIssuesDialog } from './dialogs'
import { cspOf, errorParts, exceptionsOf, messageOf } from './event'
import { ago, brief, compact, exact } from './format'
import { ContextRail, CspSection, Fingerprints, RequestSection, Section, TagsRail, Timeline, UserReports } from './issue-sections'
import { LevelGlyph } from './level'
import { StackTrace } from './stack-trace'
import { ACTION, STATUS, isStatus, statusActions } from './status'
import { PeriodToggle, ReleaseTrace } from './trace'
import { axisFor, axisStartLabel, fillBuckets, periodInfo, releaseMarks } from './trend'
import { isNotFound } from '@/api/errors'

// Enough of an event id to tell two apart; the full id is in the title and the raw event.
const EVENT_ID_SHOWN = 8

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

// A headline figure. A relative time opens to the exact moment, on tap as well as on hover.
function Fact({ label, value, detail, moment }: { label: string; value: string; detail?: string; moment?: string }) {
  const figure = <span className="text-lg font-semibold lg:text-xl">{value}</span>
  return (
    <div className="min-w-0">
      <dt className="label-caps">{label}</dt>
      <dd className={cn('mono mt-1', !moment && 'truncate')}>
        {moment ? (
          <Popover>
            <PopoverTrigger title={exact(moment)} aria-label={`${label} ${exact(moment)}`} className="underline decoration-border decoration-dotted underline-offset-4 max-lg:-my-3 max-lg:min-w-11 max-lg:py-3 max-lg:text-left">
              {figure}
            </PopoverTrigger>
            <PopoverContent className="mono w-auto px-3 py-2">
              <time dateTime={moment}>{exact(moment)}</time>
            </PopoverContent>
          </Popover>
        ) : (
          figure
        )}
        {detail && <span className="text-muted-foreground max-lg:block lg:ml-2">{detail}</span>}
      </dd>
    </div>
  )
}

// `resolvingNext` holds the label while the backend picks the release.
function statusLabel(issue: IssueDetail, resolvingNext: boolean) {
  const release = issue.statusDetails?.inRelease
  if (issue.status === IssueStatus.resolved && release) return `Resolved in ${releaseName(release)}`
  if (issue.status === IssueStatus.resolved && resolvingNext) return 'Resolved in next release'
  return isStatus(issue.status) ? STATUS[issue.status].label : issue.status
}

export function IssuePage({ org, issueId, eventId }: { org: string; issueId: string; eventId?: string }) {
  const navigate = useNavigate()
  const issue = useQuery(issueQuery(org, issueId))
  const event = useQuery(issueEventQuery(org, issueId, eventId))
  // The backend keeps no user count per issue; the distinct values of the user tag are the people affected.
  const tags = useQuery(issueTagsQuery(org, issueId)).data
  const users = (tags?.find((tag) => tag.key === TagKey.userId) ?? tags?.find((tag) => tag.key === TagKey.userEmail))?.uniqueValues
  const access = useQuery(organizationQuery(org)).data?.access
  const canWrite = canWriteEvents(access)
  const canAdmin = canAdminEvents(access)
  const settings = useQuery(instanceSettingsQuery).data
  const actions = useIssueActions(org)
  const [assigning, setAssigning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  useTitle(issue.data?.shortId ?? 'Issue')

  const data = issue.data
  const status = data?.status
  const target = oneIssue(issueId)
  const offered = status && isStatus(status) ? statusActions(status) : []
  const setStatus = (next: IssueStatus) => canWrite && void actions.setStatus(target, next)
  // Offered only for an unresolved issue; the page bar, the phone menu and the palette all read this.
  const [resolvingNext, setResolvingNext] = useState(false)
  const resolveNext =
    canWrite && status === IssueStatus.unresolved
      ? () => {
          setResolvingNext(true)
          void actions.resolveInNextRelease(target).finally(() => setResolvingNext(false))
        }
      : undefined
  const toEvent = (id: string | null | undefined) =>
    id && void navigate({ to: '/$org/issues/$issueId/events/$eventId', params: { org, issueId, eventId: id } })
  const older = event.data?.previousEventID
  const newer = event.data?.nextEventID
  const rawUrl = event.data ? rawEventUrl(org, issueId, event.data.id) : undefined
  const copyAi = () => {
    if (event.data) copyForAi(event.data, { instanceName: settings?.glitchtipInstanceName, org, issueId }, settings?.enabledFeatures).catch((error: unknown) => failed(error, 'copy the event'))
  }
  const copyLink = () => void navigator.clipboard.writeText(`${window.location.origin}/${org}/issues/${issueId}`).then(() => notify('Link copied'))

  useHotkeys({
    ...Object.fromEntries(offered.map((action) => [action.key, () => setStatus(action.status)])),
    [ACTION.assign.key]: () => canWrite && setAssigning(true),
    '[': () => toEvent(older),
    ']': () => toEvent(newer),
  })

  const commands: Command[] = [
    ...(canWrite
      ? [
          ...offered.map((action) => ({ id: `issue:${action.status}`, group: CommandGroup.issue, label: action.action, keys: action.key, run: () => setStatus(action.status) })),
          ...(resolveNext ? [{ id: 'issue:next-release', group: CommandGroup.issue, label: ACTION.resolveNext.label, run: resolveNext }] : []),
          { id: 'issue:assign', group: CommandGroup.issue, label: ACTION.assign.label, keys: ACTION.assign.key, run: () => setAssigning(true) },
        ]
      : []),
    ...(older ? [{ id: 'issue:older', group: CommandGroup.issue, label: 'Older event', keys: '[', run: () => toEvent(older) }] : []),
    ...(newer ? [{ id: 'issue:newer', group: CommandGroup.issue, label: 'Newer event', keys: ']', run: () => toEvent(newer) }] : []),
    { id: 'issue:copy', group: CommandGroup.issue, label: 'Copy link', run: copyLink },
    ...(event.data ? [{ id: 'issue:copy-ai', group: CommandGroup.issue, label: 'Copy event for AI', run: copyAi }] : []),
    ...(rawUrl ? [{ id: 'issue:json', group: CommandGroup.issue, label: 'Open raw event', run: () => void window.open(rawUrl, '_blank') }] : []),
    ...(canWrite ? [{ id: 'issue:delete', group: CommandGroup.issue, label: 'Delete issue', run: () => setDeleting(true) }] : []),
  ]
  useCommands(data ? commands : [])

  const bar = (
    <PageBar>
      <Link
        to="/$org/issues"
        params={{ org }}
        search={data ? { project: [Number(data.project.id)] } : undefined}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground max-lg:h-11"
      >
        <ChevronLeft className="size-4" />
        Issues
      </Link>
      {data && (
        <>
          <span className="text-muted-foreground">/</span>
          <span className="mono font-semibold">{data.shortId}</span>
          <span className={cn('label-caps', data.status === IssueStatus.resolved && 'text-ok')}>{statusLabel(data, resolvingNext)}</span>
        </>
      )}
      {data && (
        <div className="ml-auto flex items-center gap-2">
          {canWrite && (
            <div className="flex items-center gap-2 max-lg:hidden">
              {offered[0] && (
                <span className="flex">
                  <Button size="sm" variant="default" onClick={() => setStatus(offered[0]!.status)}>
                    {offered[0].action}
                    <Kbd>{offered[0].key}</Kbd>
                  </Button>
                  {resolveNext && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="default" className="border-l-primary-foreground/30" aria-label="More ways to resolve">
                          <ChevronDown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={resolveNext}>{ACTION.resolveNext.label}</DropdownMenuItem>
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
                {data.assignedTo ? data.assignedTo.name : ACTION.assign.label}
                <Kbd>{ACTION.assign.key}</Kbd>
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
              {resolveNext && (
                <DropdownMenuItem className="lg:hidden" onSelect={resolveNext}>
                  {ACTION.resolveNext.label}
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
    const missing = isNotFound(issue.error)
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
          <h1 className="flex items-baseline gap-3 text-xl leading-snug font-semibold lg:text-2xl">
            <LevelGlyph level={data.level} className="size-3" />
            <span className="min-w-0 break-words">
              {type && <span className="font-mono text-lg lg:text-xl">{type} </span>}
              <span className={cn(type && 'font-medium')}>{text}</span>
            </span>
          </h1>
          {data.culprit && <p className="mono mt-1 truncate pl-6 text-muted-foreground">{data.culprit}</p>}
          <dl className="mt-4 flex gap-x-5 lg:mt-5 lg:flex lg:gap-x-10 lg:pl-6">
            <Fact label="Events" value={compact(data.count)} />
            {users !== undefined && <Fact label="Users" value={compact(users)} />}
            <Fact label="First seen" value={ago(data.firstSeen)} detail={data.firstRelease ? releaseName(data.firstRelease.shortVersion) : undefined} moment={data.firstSeen} />
            <Fact label="Last seen" value={ago(data.lastSeen)} detail={data.lastRelease ? releaseName(data.lastRelease.shortVersion) : undefined} moment={data.lastSeen} />
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
              <div className="flex flex-wrap items-center gap-x-2 border-b pb-2">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="label-caps font-semibold text-foreground">Event</span>
                  <span className="mono" title={event.data.eventID}>
                    {event.data.eventID.slice(0, EVENT_ID_SHOWN)}
                  </span>
                  <time className="mono text-muted-foreground" dateTime={event.data.dateCreated} title={exact(event.data.dateCreated)}>
                    <span className="lg:hidden">{brief(event.data.dateCreated)}</span>
                    <span className="max-lg:hidden">{exact(event.data.dateCreated)}</span>
                  </time>
                </div>
                <div className="ml-auto flex shrink-0 items-center">
                  <Button variant="ghost" size="bar" onClick={copyAi}>
                    <Copy />
                    Copy for AI
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="max-lg:size-11" disabled={!older} onClick={() => toEvent(older)} aria-label="Older event">
                    <ChevronLeft />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="max-lg:size-11" disabled={!newer} onClick={() => toEvent(newer)} aria-label="Newer event">
                    <ChevronRight />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="max-lg:size-11" disabled={!newer} asChild={!!newer} aria-label="Latest event">
                    {newer ? (
                      <Link to="/$org/issues/$issueId" params={{ org, issueId }}>
                        <ChevronsRight />
                      </Link>
                    ) : (
                      <ChevronsRight />
                    )}
                  </Button>
                  {rawUrl && (
                    <a href={rawUrl} target="_blank" rel="noreferrer" className="mono ml-1 px-2 text-muted-foreground underline hover:text-foreground max-lg:hidden">
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
                    <StackTrace exceptions={exceptions} platform={event.data.platform} />
                  </Section>
                ) : (
                  message && (
                    <Section title="Message">
                      <pre className="mono overflow-x-auto border bg-code p-3 whitespace-pre-wrap">{message.formatted ?? message.message}</pre>
                    </Section>
                  )
                )}
                {cspOf(event.data) && <CspSection event={event.data} />}
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
        <div className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center gap-2 border-t bg-card px-3 pb-[env(safe-area-inset-bottom)] lg:hidden">
          {offered.slice(0, 2).map((action, index) => (
            <Button key={action.status} size="touch" variant={index === 0 ? 'default' : 'outline'} className="flex-1" onClick={() => setStatus(action.status)}>
              {action.action}
            </Button>
          ))}
          <Button size="touch" className="flex-1" onClick={() => setAssigning(true)}>
            <AssigneeBadge assignee={data.assignedTo} />
            {ACTION.assign.label}
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
