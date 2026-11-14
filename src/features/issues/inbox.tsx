import { keepPreviousData, useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowDownWideNarrow, ChevronDown, Ellipsis, MessageSquare, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { IssueStatus, StatsPeriod, issueListQuery, issueStatsQuery, type Issue } from '@/api/issues'
import { organizationQuery } from '@/api/organizations'
import { recentReleasesQuery } from '@/api/releases'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { useCommands, type Command } from '@/components/shell/commands'
import { ScopeFilters } from '@/components/shell/scope-filters'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { useHotkeys } from '@/lib/hotkeys'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { useIssueActions, type Target } from './actions'
import { Dossier } from './dossier'
import { ago, compact, dayLabel, exact } from './format'
import { AssignDialog, AssigneeBadge, LevelGlyph, Skeleton, Trace } from './parts'
import { DEFAULT_QUERY, DEFAULT_SORT, SORTS, statusOf, toFilters, withStatus, type InboxSearch } from './search'
import { Trend, axisFor, classify, fillBuckets, releaseMarks, type Mark } from './trend'

const COLUMNS = 'lg:grid-cols-[44px_minmax(0,5fr)_minmax(0,4fr)_64px_56px_72px_36px]'
const TABS = [
  { status: IssueStatus.unresolved, label: 'Unresolved' },
  { status: IssueStatus.resolved, label: 'Resolved' },
  { status: IssueStatus.ignored, label: 'Ignored' },
  { status: undefined, label: 'All' },
]
const GROUPS = [
  { trend: Trend.new, label: 'New', color: 'text-trend-new' },
  { trend: Trend.spiking, label: 'Spiking', color: 'text-trend-spiking' },
  { trend: Trend.ongoing, label: 'Ongoing', color: 'text-muted-foreground' },
]
const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

type Row = { issue: Issue; buckets: number[]; trend: Trend }

function IssueTitle({ issue }: { issue: Issue }) {
  const { type, value } = issue.metadata as { type?: string; value?: string }
  if (!type) return <span className="truncate font-medium max-lg:line-clamp-2 max-lg:whitespace-normal">{issue.title}</span>
  return (
    <span className="truncate max-lg:line-clamp-2 max-lg:whitespace-normal">
      <span className="font-mono text-[0.8125rem] font-semibold">{type}</span> <span>{value}</span>
    </span>
  )
}

function IssueRow({
  org,
  row,
  marks,
  selected,
  current,
  unfolded,
  canWrite,
  onSelect,
  onUnfold,
  onAssign,
  actions,
}: {
  org: string
  row: Row
  marks: Mark[]
  selected: boolean
  current: boolean
  unfolded: boolean
  canWrite: boolean
  onSelect: () => void
  onUnfold: () => void
  onAssign: () => void
  actions: React.ReactNode
}) {
  const { issue, buckets, trend } = row
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (current) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [current])
  return (
    <li ref={ref} className="scroll-mt-28 scroll-mb-20 border-b">
      <div
        className={cn(
          'relative grid grid-cols-[44px_minmax(0,1fr)_64px] items-center pr-3 transition-colors duration-100 lg:pr-4',
          COLUMNS,
          selected ? 'bg-selected' : current ? 'bg-accent' : 'hover:bg-accent/60',
        )}
      >
        {canWrite ? (
          <Checkbox hit checked={selected} onCheckedChange={onSelect} aria-label={`Select ${issue.shortId}`} className="relative z-10 lg:mx-auto" />
        ) : (
          <span />
        )}
        <div className="min-w-0 py-2.5 lg:py-2">
          <Link
            to="/$org/issues/$issueId"
            params={{ org, issueId: issue.id }}
            className="flex items-center gap-2 max-lg:items-start after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand"
          >
            <LevelGlyph level={issue.level} className="max-lg:mt-[7px]" />
            <IssueTitle issue={issue} />
          </Link>
          <div className="mono mt-0.5 flex items-center gap-2 pl-[18px] text-muted-foreground">
            <span className="shrink-0">{issue.shortId}</span>
            <span className="truncate max-lg:hidden">{issue.culprit}</span>
            <span className="shrink-0 lg:hidden">
              {ago(issue.lastSeen)} · {compact(issue.count)} ev
            </span>
            {issue.numComments > 0 && (
              <span className="flex shrink-0 items-center gap-1">
                <MessageSquare className="size-3" />
                {issue.numComments}
              </span>
            )}
          </div>
        </div>
        <Trace buckets={buckets} trend={trend} marks={marks.map((mark) => mark.at)} height={22} className="lg:mx-4" />
        <span className="mono text-right max-lg:hidden">{compact(issue.count)}</span>
        <time className="mono text-right text-muted-foreground max-lg:hidden" dateTime={issue.lastSeen} title={exact(issue.lastSeen)}>
          {ago(issue.lastSeen)}
        </time>
        <span className="flex justify-end max-lg:hidden">
          {canWrite ? (
            <button type="button" onClick={onAssign} aria-label={issue.assignedTo ? `Assigned to ${issue.assignedTo.name}. Change` : 'Assign'} className="relative z-10 grid size-8 place-items-center hover:bg-card">
              <AssigneeBadge assignee={issue.assignedTo} />
            </button>
          ) : (
            <span className="grid size-8 place-items-center">
              <AssigneeBadge assignee={issue.assignedTo} />
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onUnfold}
          aria-expanded={unfolded}
          aria-label={`Details of ${issue.shortId}`}
          className="relative z-10 ml-auto grid size-8 place-items-center text-muted-foreground hover:bg-card hover:text-foreground max-lg:hidden"
        >
          <ChevronDown className={cn('size-4 transition-transform duration-200', unfolded && 'rotate-180')} />
        </button>
      </div>
      {unfolded && (
        <div className="max-lg:hidden">
          <Dossier org={org} issue={issue}>
            {actions}
          </Dossier>
        </div>
      )}
    </li>
  )
}

function SkeletonRows() {
  return (
    <ul aria-busy aria-label="Loading issues">
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index} className={cn('grid grid-cols-[44px_minmax(0,1fr)_64px] items-center border-b py-2.5 pr-3 lg:pr-4', COLUMNS)}>
          <span />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 lg:mx-4" />
        </li>
      ))}
    </ul>
  )
}

export function Inbox({ org, search }: { org: string; search: InboxSearch }) {
  useTitle('Issues')
  const navigate = useNavigate()
  const filters = useMemo(() => toFilters(search), [search])
  const query = filters.query ?? ''
  const status = statusOf(query)
  const list = useInfiniteQuery(issueListQuery(org, filters))
  const pages = list.data?.pages
  const access = useQuery(organizationQuery(org)).data?.access ?? []
  const canWrite = access.includes('event:write') || access.includes('event:admin')
  const releases = useQuery(recentReleasesQuery(org)).data
  const stats = useQueries({
    queries: (pages ?? []).map((page) => ({
      ...issueStatsQuery(
        org,
        page.items.map((issue) => issue.id),
        StatsPeriod.fortnight,
      ),
      placeholderData: keepPreviousData,
    })),
    combine: (results) => new Map(results.flatMap((result) => result.data ?? []).map((stat) => [stat.id, stat.stats['14d']])),
  })

  const now = useMemo(() => new Date(list.dataUpdatedAt), [list.dataUpdatedAt])
  const axis = useMemo(() => axisFor(StatsPeriod.fortnight, now), [now])
  const marks = useMemo(() => releaseMarks(releases ?? [], axis), [releases, axis])
  const groups = useMemo(() => {
    const rows = (pages ?? [])
      .flatMap((page) => page.items)
      .map((issue): Row => {
        const buckets = fillBuckets(stats.get(issue.id), axis)
        return { issue, buckets, trend: classify(issue.firstSeen, buckets, now) }
      })
    return GROUPS.map((group) => ({ ...group, rows: rows.filter((row) => row.trend === group.trend) })).filter((group) => group.rows.length > 0)
  }, [pages, stats, axis, now])
  const rows = useMemo(() => groups.flatMap((group) => group.rows), [groups])
  const totals = useMemo(() => axisTotals(rows, axis.count), [rows, axis.count])
  const peak = Math.max(...totals, 0)
  const first = pages?.[0]
  const hits = first?.hits === undefined ? undefined : first.maxHits !== undefined && first.hits >= first.maxHits ? `${first.maxHits}+` : String(first.hits)

  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [allMatching, setAllMatching] = useState(false)
  const [cursor, setCursor] = useState<string>()
  const [unfolded, setUnfolded] = useState<string>()
  const [assigning, setAssigning] = useState<Target>()
  const [deleting, setDeleting] = useState<Target>()
  const searchRef = useRef<HTMLInputElement>(null)
  const actions = useIssueActions(org)

  const loadedIds = rows.map((row) => row.issue.id)
  const selectedIds = loadedIds.filter((id) => picked.has(id))
  const selecting = selectedIds.length > 0
  const everyLoaded = selecting && selectedIds.length === loadedIds.length
  const moreThanLoaded = !!list.hasNextPage
  const clear = () => {
    setPicked(new Set())
    setAllMatching(false)
  }
  const toggle = (id: string) => {
    const next = new Set(picked)
    if (!next.delete(id)) next.add(id)
    setPicked(next)
    setAllMatching(false)
  }
  const selectionTarget: Target = allMatching ? { selection: { filters }, ids: loadedIds } : { selection: { ids: selectedIds }, ids: selectedIds }
  const selectedRows = rows.filter((row) => picked.has(row.issue.id))
  const canMerge = !allMatching && selectedRows.length >= 2 && new Set(selectedRows.map((row) => row.issue.project.id)).size === 1
  const count = allMatching ? (hits ?? String(selectedIds.length)) : String(selectedIds.length)
  const noun = allMatching || selectedIds.length !== 1 ? 'issues' : 'issue'

  const go = (patch: Partial<InboxSearch>) => {
    clear()
    void navigate({ to: '/$org/issues', params: { org }, search: (previous) => ({ ...previous, ...patch }) })
  }
  const setQuery = (next: string) => go({ query: next === DEFAULT_QUERY ? undefined : next })

  // What a key or a command acts on: the selection, or else the row under the cursor.
  const target = (): Target | undefined => {
    if (selecting) return selectionTarget
    return cursor && loadedIds.includes(cursor) ? { selection: { ids: [cursor] }, ids: [cursor] } : undefined
  }
  const act = (run: (on: Target) => unknown) => {
    const on = target()
    if (!on || !canWrite) return
    void run(on)
    clear()
  }
  const move = (step: number) => {
    const index = cursor ? loadedIds.indexOf(cursor) : -1
    const next = loadedIds[Math.max(0, Math.min(loadedIds.length - 1, index + step))]
    if (next) setCursor(next)
  }
  const merge = () => {
    if (!canMerge) return
    void actions.merge(selectedIds)
    clear()
  }

  useHotkeys({
    '/': (event) => {
      event.preventDefault()
      searchRef.current?.focus()
    },
    j: () => move(1),
    k: () => move(-1),
    x: () => cursor && canWrite && toggle(cursor),
    o: () => cursor && setUnfolded(unfolded === cursor ? undefined : cursor),
    Enter: () => cursor && void navigate({ to: '/$org/issues/$issueId', params: { org, issueId: cursor } }),
    e: () => status !== IssueStatus.resolved && act((on) => actions.setStatus(on, IssueStatus.resolved)),
    i: () => status !== IssueStatus.ignored && act((on) => actions.setStatus(on, IssueStatus.ignored)),
    u: () => status !== IssueStatus.unresolved && act((on) => actions.setStatus(on, IssueStatus.unresolved)),
    a: () => canWrite && setAssigning(target()),
    m: merge,
    Escape: () => (selecting ? clear() : setUnfolded(undefined)),
  })

  const statusActions = [
    { status: IssueStatus.resolved, label: 'Resolve', keys: 'e' },
    { status: IssueStatus.ignored, label: 'Ignore', keys: 'i' },
    { status: IssueStatus.unresolved, label: 'Unresolve', keys: 'u' },
  ].filter((action) => action.status !== status)

  const commands: Command[] = selecting
    ? [
        ...statusActions.map((action) => ({
          id: `selection:${action.status}`,
          group: 'selection',
          label: `${action.label} ${count} ${noun}`,
          keys: action.keys,
          run: () => act((on) => actions.setStatus(on, action.status)),
        })),
        { id: 'selection:assign', group: 'selection', label: `Assign ${count} ${noun}`, keys: 'a', run: () => setAssigning(selectionTarget) },
        ...(canMerge ? [{ id: 'selection:merge', group: 'selection', label: `Merge ${count} issues`, keys: 'm', run: merge }] : []),
        { id: 'selection:delete', group: 'selection', label: `Delete ${count} ${noun}`, run: () => setDeleting(selectionTarget) },
        { id: 'selection:clear', group: 'selection', label: 'Clear selection', keys: 'esc', run: clear },
      ]
    : []
  useCommands([
    ...commands,
    ...TABS.filter((tab) => tab.status !== status).map((tab) => ({
      id: `show:${tab.label}`,
      group: 'show',
      label: `${tab.label} issues`,
      run: () => setQuery(withStatus(query, tab.status)),
    })),
  ])

  const directHit = rows.length === 1 && UUID.test(query.trim()) ? rows[0]!.issue : undefined
  useEffect(() => {
    if (directHit?.matchingEventId)
      void navigate({
        to: '/$org/issues/$issueId/events/$eventId',
        params: { org, issueId: directHit.id, eventId: directHit.matchingEventId },
        replace: true,
      })
  }, [directHit, navigate, org])

  const sentinel = useRef<HTMLDivElement>(null)
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = list
  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasNextPage) return
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && !isFetchingNextPage && void fetchNextPage(), { rootMargin: '400px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const rowActions = (id: string) => {
    const on: Target = { selection: { ids: [id] }, ids: [id] }
    return (
      <>
        {statusActions.map((action, index) => (
          <Button key={action.status} size="sm" variant={index === 0 ? 'default' : 'outline'} onClick={() => void actions.setStatus(on, action.status)}>
            {action.label}
          </Button>
        ))}
        <Button size="sm" onClick={() => setAssigning(on)}>
          Assign
        </Button>
      </>
    )
  }

  return (
    <>
      <PageBar className={cn(selecting && 'max-lg:hidden')}>
        {selecting ? (
          <div className="flex min-w-0 flex-1 items-center gap-2" role="toolbar" aria-label="Selection">
            <Button variant="ghost" size="icon-sm" onClick={clear} aria-label="Clear selection">
              <X />
            </Button>
            <span className="font-medium">
              <span className="mono">{count}</span> selected
            </span>
            {everyLoaded && moreThanLoaded && !allMatching && (
              <Button variant="link" onClick={() => setAllMatching(true)}>
                Select all {hits} matching
              </Button>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              {statusActions.map((action, index) => (
                <Button key={action.status} size="sm" variant={index === 0 ? 'default' : 'outline'} onClick={() => act((on) => actions.setStatus(on, action.status))}>
                  {action.label}
                  <Kbd>{action.keys}</Kbd>
                </Button>
              ))}
              <Button size="sm" onClick={() => setAssigning(selectionTarget)}>
                Assign
                <Kbd>a</Kbd>
              </Button>
              {canMerge && (
                <Button size="sm" onClick={merge}>
                  Merge
                  <Kbd>m</Kbd>
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => setDeleting(selectionTarget)}>
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <>
            <nav className="flex h-full items-stretch gap-4 max-lg:hidden" aria-label="Status">
              {TABS.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  aria-current={tab.status === status ? 'page' : undefined}
                  onClick={() => setQuery(withStatus(query, tab.status))}
                  className={cn('border-y-2 border-transparent text-sm font-medium', tab.status === status ? 'border-b-brand' : 'text-muted-foreground hover:text-foreground')}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <SearchBox key={query} query={query} inputRef={searchRef} onSubmit={setQuery} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="max-lg:size-11 max-lg:px-0" aria-label="Sort">
                  <ArrowDownWideNarrow />
                  <span className="max-lg:hidden">{SORTS.find((sort) => sort.value === (search.sort ?? DEFAULT_SORT))?.label}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={search.sort ?? DEFAULT_SORT} onValueChange={(value) => go({ sort: value === DEFAULT_SORT ? undefined : (value as InboxSearch['sort']) })}>
                  {SORTS.map((sort) => (
                    <DropdownMenuRadioItem key={sort.value} value={sort.value}>
                      {sort.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </PageBar>

      <div className="flex items-center gap-1.5 overflow-x-auto border-b px-3 py-2 lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 shrink-0 items-center gap-1.5 border bg-card px-2.5 text-sm" aria-label="Status">
            {TABS.find((tab) => tab.status === status)?.label}
            <ChevronDown className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={status ?? ''} onValueChange={(value) => setQuery(withStatus(query, (value || undefined) as IssueStatus | undefined))}>
              {TABS.map((tab) => (
                <DropdownMenuRadioItem key={tab.label} value={tab.status ?? ''}>
                  {tab.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <ScopeFilters org={org} className="shrink-0 gap-1.5" />
      </div>

      {list.isPending ? (
        <SkeletonRows />
      ) : list.isError ? (
        <Screen title="The issues didn't load">
          <Button onClick={() => void list.refetch()}>Try again</Button>
        </Screen>
      ) : rows.length === 0 ? (
        <Screen title={query === DEFAULT_QUERY ? 'Nothing unresolved' : 'No issues match'}>
          {query === DEFAULT_QUERY ? (
            <p className="text-muted-foreground">New errors appear here as they arrive.</p>
          ) : (
            <Button onClick={() => setQuery(DEFAULT_QUERY)}>Show unresolved issues</Button>
          )}
        </Screen>
      ) : (
        <>
          <div className={cn('grid items-end border-b py-3 pr-3 pl-3 lg:pr-4 lg:pl-0', COLUMNS)}>
            <span className="max-lg:hidden" />
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span>
                <span className="mono text-[1.375rem] leading-none font-semibold lg:text-[1.625rem]">{hits}</span> {hits === '1' ? 'issue' : 'issues'}
              </span>
              {groups
                .filter((group) => group.trend !== Trend.ongoing)
                .map((group) => (
                  <span key={group.trend} className={group.color}>
                    <span className="mono font-semibold">{group.rows.length}</span> {group.label.toLowerCase()}
                  </span>
                ))}
            </p>
            <div className="relative pt-5 max-lg:hidden lg:mx-4">
              {marks.map((mark) => (
                <span
                  key={mark.at}
                  className={cn('absolute top-0 font-mono text-xs whitespace-nowrap text-brand', mark.at > 0.8 ? '-translate-x-full pr-1' : 'pl-1')}
                  style={{ left: `${mark.at * 100}%` }}
                >
                  {mark.label}
                </span>
              ))}
              <Trace buckets={totals} marks={marks.map((mark) => mark.at)} height={36} />
            </div>
            <span className="mono col-span-4 pb-px text-muted-foreground max-lg:hidden">peak {compact(peak)}/day</span>
          </div>

          <div className={cn('sticky top-11 z-10 grid h-8 items-center border-b bg-background pr-4 max-lg:hidden', COLUMNS)}>
            {canWrite ? (
              <Checkbox
                hit
                className="mx-auto"
                checked={everyLoaded ? true : selecting ? 'indeterminate' : false}
                onCheckedChange={() => (everyLoaded ? clear() : setPicked(new Set(loadedIds)))}
                aria-label="Select all"
              />
            ) : (
              <span />
            )}
            <span className="label-caps">Issue</span>
            <span className="label-caps mx-4 flex justify-between">
              <span>{dayLabel(axis.start)}</span>
              <span>Events / day</span>
              <span>Today</span>
            </span>
            <span className="label-caps text-right">Events</span>
            <span className="label-caps text-right">Seen</span>
            <span className="label-caps text-right">Assignee</span>
            <span />
          </div>

          {groups.map((group) => (
            <section key={group.trend} aria-label={group.label}>
              <h2 className={cn('label-caps flex h-8 items-center gap-2 border-b bg-muted/60 px-3 font-semibold lg:pl-[44px]', group.color)}>
                {group.label}
                <span className="font-normal text-muted-foreground">{group.rows.length}</span>
              </h2>
              <ul>
                {group.rows.map((row) => (
                  <IssueRow
                    key={row.issue.id}
                    org={org}
                    row={row}
                    marks={marks}
                    canWrite={canWrite}
                    selected={picked.has(row.issue.id)}
                    current={cursor === row.issue.id}
                    unfolded={unfolded === row.issue.id}
                    onSelect={() => toggle(row.issue.id)}
                    onUnfold={() => setUnfolded(unfolded === row.issue.id ? undefined : row.issue.id)}
                    onAssign={() => setAssigning({ selection: { ids: [row.issue.id] }, ids: [row.issue.id] })}
                    actions={canWrite && rowActions(row.issue.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
          <div ref={sentinel} className="grid h-14 place-items-center">
            {hasNextPage && (
              <Button variant="ghost" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage} aria-busy={isFetchingNextPage}>
                Load more
              </Button>
            )}
          </div>
        </>
      )}

      {selecting && (
        <div role="toolbar" aria-label="Selection" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
          {everyLoaded && moreThanLoaded && !allMatching && (
            <button type="button" onClick={() => setAllMatching(true)} className="flex h-11 w-full items-center justify-center border-b text-sm text-brand">
              Select all {hits} matching
            </button>
          )}
          <div className="flex h-14 items-center gap-1.5 px-1.5">
            <Button variant="ghost" size="icon-touch" onClick={clear} aria-label="Clear selection">
              <X />
            </Button>
            <span className="mr-auto font-medium">
              <span className="mono">{count}</span> selected
            </span>
            {statusActions.slice(0, 2).map((action, index) => (
              <Button key={action.status} size="touch" variant={index === 0 ? 'default' : 'outline'} onClick={() => act((on) => actions.setStatus(on, action.status))}>
                {action.label}
              </Button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-touch" aria-label="More actions">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                {statusActions.slice(2).map((action) => (
                  <DropdownMenuItem key={action.status} onSelect={() => act((on) => actions.setStatus(on, action.status))}>
                    {action.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={() => setAssigning(selectionTarget)}>Assign</DropdownMenuItem>
                {canMerge && <DropdownMenuItem onSelect={merge}>Merge</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setDeleting(selectionTarget)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      <AssignDialog
        org={org}
        open={!!assigning}
        current={assigning?.ids.length === 1 ? rows.find((row) => row.issue.id === assigning.ids[0])?.issue.assignedTo : undefined}
        onClose={() => setAssigning(undefined)}
        onPick={(assignee) => {
          if (assigning) void actions.assign(assigning, assignee)
          clear()
        }}
      />
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(undefined)}>
        <DialogContent className="p-5">
          <DialogTitle>
            Delete {count} {noun}?
          </DialogTitle>
          <DialogDescription className="mt-2">Their events are deleted too. This can't be undone.</DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <Button>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) void actions.remove(deleting)
                setDeleting(undefined)
                clear()
              }}
            >
              Delete {count} {noun}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function axisTotals(rows: Row[], length: number) {
  const totals = Array.from({ length }, () => 0)
  for (const row of rows) row.buckets.forEach((count, index) => (totals[index] = (totals[index] ?? 0) + count))
  return totals
}

function SearchBox({ query, inputRef, onSubmit }: { query: string; inputRef: React.RefObject<HTMLInputElement | null>; onSubmit: (query: string) => void }) {
  const [text, setText] = useState(query)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(text.trim())
  }
  return (
    <form onSubmit={submit} role="search" className="flex h-8 min-w-0 flex-1 items-center gap-2 border bg-background px-2.5 focus-within:border-brand max-lg:h-9">
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label="Search issues"
        spellCheck={false}
        autoCapitalize="off"
        className="mono h-full min-w-0 flex-1 bg-transparent outline-none focus-visible:outline-none max-lg:text-[1rem]"
      />
      <Kbd>/</Kbd>
    </form>
  )
}
