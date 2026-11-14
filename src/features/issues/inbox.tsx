import { keepPreviousData, useInfiniteQuery, useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Ellipsis, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StatsPeriod, issueListQuery, issueStatsQuery, type IssueStatus } from '@/api/issues'
import { canWriteEvents, organizationQuery } from '@/api/organizations'
import { recentReleasesQuery } from '@/api/releases'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { useCommands, type Command } from '@/components/shell/commands'
import { ScopeFilters } from '@/components/shell/scope-filters'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { useHotkeys } from '@/lib/hotkeys'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { oneIssue, useIssueActions, type Target } from './actions'
import { AssignDialog } from './assignee'
import { ConfirmDialog, DeleteIssuesDialog } from './dialogs'
import type { RowHandlers } from './dossier'
import { compact } from './format'
import { SearchBox, SortMenu, StatusMenu, StatusTabs, TimeRangeMenu } from './inbox-controls'
import { COLUMNS, IssueRow, SkeletonRows, type Row } from './inbox-row'
import { DEFAULT_QUERY, statusOf, toFilters, withStatus, type InboxSearch } from './search'
import { useSelection } from './selection'
import { STATUS_VIEWS, statusActions, type StatusView } from './status'
import { PeriodToggle, ReleaseTrace } from './trace'
import { Trend, axisFor, axisStartLabel, classify, fillBuckets, periodInfo, releaseMarks } from './trend'

const GROUPS = [
  { trend: Trend.new, label: 'New', color: 'text-trend-new' },
  { trend: Trend.spiking, label: 'Spiking', color: 'text-trend-spiking' },
  { trend: Trend.ongoing, label: 'Ongoing', color: 'text-muted-foreground' },
]
const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

type Stats = Awaited<ReturnType<NonNullable<ReturnType<typeof issueStatsQuery>['queryFn']>>>

// Module-level, so the combined map keeps its identity while the results are unchanged.
const bucketsById = (period: StatsPeriod) => (results: UseQueryResult<Stats>[]) =>
  new Map(results.flatMap((result) => result.data ?? []).map((stat) => [stat.id, stat.stats[period]]))
const fortnightById = bucketsById(StatsPeriod.fortnight)
const dayById = bucketsById(StatsPeriod.day)

function axisTotals(rows: Row[], length: number) {
  const totals = Array.from({ length }, () => 0)
  for (const row of rows) row.buckets.forEach((count, index) => (totals[index] = (totals[index] ?? 0) + count))
  return totals
}

export function Inbox({ org, search }: { org: string; search: InboxSearch }) {
  useTitle('Issues')
  const navigate = useNavigate()
  const filters = useMemo(() => toFilters(search), [search])
  const query = filters.query ?? ''
  const view = statusOf(query)
  const list = useInfiniteQuery(issueListQuery(org, filters))
  const pages = list.data?.pages
  const canWrite = canWriteEvents(useQuery(organizationQuery(org)).data?.access)
  const releases = useQuery(recentReleasesQuery(org)).data
  const [period, setPeriod] = useState<StatsPeriod>(StatsPeriod.fortnight)

  const idPages = useMemo(() => (pages ?? []).map((page) => page.items.map((issue) => issue.id)), [pages])
  // Two weeks of daily counts decide new, spiking or ongoing, whichever period the traces show.
  const fortnight = useQueries({
    queries: idPages.map((ids) => ({ ...issueStatsQuery(org, ids, StatsPeriod.fortnight), placeholderData: keepPreviousData })),
    combine: fortnightById,
  })
  const day = useQueries({
    queries: period === StatsPeriod.day ? idPages.map((ids) => ({ ...issueStatsQuery(org, ids, StatsPeriod.day), placeholderData: keepPreviousData })) : [],
    combine: dayById,
  })

  const now = useMemo(() => new Date(list.dataUpdatedAt), [list.dataUpdatedAt])
  const axis = useMemo(() => axisFor(period, now), [period, now])
  const marks = useMemo(() => releaseMarks(releases ?? [], axis), [releases, axis])
  const groups = useMemo(() => {
    const trendAxis = axisFor(StatsPeriod.fortnight, now)
    const rows = (pages ?? [])
      .flatMap((page) => page.items)
      .map((issue): Row => {
        const daily = fillBuckets(fortnight.get(issue.id), trendAxis)
        const buckets = period === StatsPeriod.fortnight ? daily : fillBuckets(day.get(issue.id), axis)
        return { issue, buckets, trend: classify(issue.firstSeen, daily, now) }
      })
    return GROUPS.map((group) => ({ ...group, rows: rows.filter((row) => row.trend === group.trend) })).filter((group) => group.rows.length > 0)
  }, [pages, fortnight, day, period, axis, now])
  const rows = useMemo(() => groups.flatMap((group) => group.rows), [groups])
  const totals = useMemo(() => axisTotals(rows, axis.count), [rows, axis.count])
  const first = pages?.[0]
  const hits = first?.hits === undefined ? undefined : first.maxHits !== undefined && first.hits >= first.maxHits ? `${first.maxHits}+` : String(first.hits)

  const selection = useSelection(JSON.stringify([org, filters]))
  const [cursor, setCursor] = useState<string>()
  const [unfolded, setUnfolded] = useState<string>()
  const [assigning, setAssigning] = useState<Target>()
  const [deleting, setDeleting] = useState<Target>()
  const [merging, setMerging] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const actions = useIssueActions(org)

  const loadedIds = useMemo(() => rows.map((row) => row.issue.id), [rows])
  const selectedRows = rows.filter((row) => selection.ids.has(row.issue.id))
  const selectedIds = selectedRows.map((row) => row.issue.id)
  const selecting = selectedIds.length > 0
  const everyLoaded = selecting && selectedIds.length === loadedIds.length
  // "All matching" only holds while every loaded row is still ticked.
  const allMatching = selection.all && everyLoaded
  const canSelectAllMatching = everyLoaded && !!list.hasNextPage && !allMatching
  const selectionTarget: Target = allMatching ? { selection: { filters }, ids: loadedIds } : { selection: { ids: selectedIds }, ids: selectedIds }
  const canMerge = !allMatching && selectedRows.length >= 2 && new Set(selectedRows.map((row) => row.issue.project.id)).size === 1
  // The backend keeps the newest issue of a merge.
  const survivor = selectedRows.reduce<Row | undefined>((newest, row) => (!newest || Number(row.issue.id) > Number(newest.issue.id) ? row : newest), undefined)
  // The backend only takes a status change or a delete for "every match"; assigning needs the issues named.
  const canAssign = !allMatching
  const count = allMatching ? (hits ?? String(selectedIds.length)) : String(selectedIds.length)
  const noun = allMatching || selectedIds.length !== 1 ? 'issues' : 'issue'
  const offered = statusActions(view)

  const go = (patch: Partial<InboxSearch>) => void navigate({ to: '/$org/issues', params: { org }, search: (previous) => ({ ...previous, ...patch }) })
  const setQuery = (next: string) => go({ query: next === DEFAULT_QUERY ? undefined : next })
  const setView = (next: StatusView) => setQuery(withStatus(query, next))

  // What a key or a command acts on: the selection, or else the row under the cursor.
  const target = (): Target | undefined => {
    if (selecting) return selectionTarget
    return cursor && loadedIds.includes(cursor) ? oneIssue(cursor) : undefined
  }
  const setStatus = (status: IssueStatus) => {
    const on = target()
    if (!on || !canWrite) return
    void actions.setStatus(on, status)
    selection.clear()
  }
  const assign = () => {
    const on = target()
    if (on && canWrite && (canAssign || !selecting)) setAssigning(on)
  }
  const move = (step: number) => {
    const index = cursor ? loadedIds.indexOf(cursor) : -1
    const next = loadedIds[Math.max(0, Math.min(loadedIds.length - 1, index + step))]
    if (next) setCursor(next)
  }

  const { toggle } = selection
  const { setStatus: changeStatus } = actions
  const handlers: RowHandlers = useMemo(
    () => ({
      toggle,
      unfold: (id) => setUnfolded((open) => (open === id ? undefined : id)),
      assign: (id) => setAssigning(oneIssue(id)),
      setStatus: (id, status) => void changeStatus(oneIssue(id), status),
    }),
    [toggle, changeStatus, setAssigning, setUnfolded],
  )

  useHotkeys({
    '/': (event) => {
      event.preventDefault()
      searchRef.current?.focus()
    },
    j: () => move(1),
    k: () => move(-1),
    x: () => cursor && canWrite && selection.toggle(cursor),
    o: () => cursor && handlers.unfold(cursor),
    Enter: () => cursor && void navigate({ to: '/$org/issues/$issueId', params: { org, issueId: cursor } }),
    ...Object.fromEntries(offered.map((action) => [action.key, () => setStatus(action.status)])),
    a: assign,
    m: () => canMerge && setMerging(true),
    Escape: () => (selecting ? selection.clear() : setUnfolded(undefined)),
  })

  const commands: Command[] = selecting
    ? [
        ...offered.map((action) => ({
          id: `selection:${action.status}`,
          group: 'selection',
          label: `${action.action} ${count} ${noun}`,
          keys: action.key,
          run: () => setStatus(action.status),
        })),
        ...(canAssign ? [{ id: 'selection:assign', group: 'selection', label: `Assign ${count} ${noun}`, keys: 'a', run: assign }] : []),
        ...(canMerge ? [{ id: 'selection:merge', group: 'selection', label: `Merge ${count} issues`, keys: 'm', run: () => setMerging(true) }] : []),
        { id: 'selection:delete', group: 'selection', label: `Delete ${count} ${noun}`, run: () => setDeleting(selectionTarget) },
        { id: 'selection:clear', group: 'selection', label: 'Clear selection', keys: 'esc', run: selection.clear },
      ]
    : []
  useCommands([
    ...commands,
    ...STATUS_VIEWS.filter((item) => item.view !== view).map((item) => ({ id: `show:${item.view}`, group: 'show', label: `${item.label} issues`, run: () => setView(item.view) })),
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

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = list
  const observe = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !hasNextPage) return
      const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && !isFetchingNextPage && void fetchNextPage(), { rootMargin: '400px' })
      observer.observe(node)
      return () => observer.disconnect()
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  )

  const filtered = query !== DEFAULT_QUERY || search.project || search.environment || search.start || search.end
  const unit = periodInfo(period)

  return (
    <>
      <PageBar className={cn(selecting && 'max-lg:hidden')}>
        {selecting ? (
          <div className="flex min-w-0 flex-1 items-center gap-2" role="toolbar" aria-label="Selection">
            <Button variant="ghost" size="icon-sm" onClick={selection.clear} aria-label="Clear selection">
              <X />
            </Button>
            <span className="font-medium">
              <span className="mono">{count}</span> selected
            </span>
            {canSelectAllMatching && (
              <Button variant="link" onClick={selection.selectAllMatching}>
                Select all {hits} matching
              </Button>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              {offered.map((action, index) => (
                <Button key={action.status} size="sm" variant={index === 0 ? 'default' : 'outline'} onClick={() => setStatus(action.status)}>
                  {action.action}
                  <Kbd>{action.key}</Kbd>
                </Button>
              ))}
              {canAssign && (
                <Button size="sm" onClick={assign}>
                  Assign
                  <Kbd>a</Kbd>
                </Button>
              )}
              {canMerge && (
                <Button size="sm" onClick={() => setMerging(true)}>
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
            <StatusTabs view={view} onChange={setView} />
            <SearchBox key={query} query={query} inputRef={searchRef} onSubmit={setQuery} />
            <div className="max-lg:hidden">
              <TimeRangeMenu search={search} onChange={go} />
            </div>
            <SortMenu sort={search.sort} onChange={(sort) => go({ sort })} />
          </>
        )}
      </PageBar>

      <div className="flex items-center gap-1.5 overflow-x-auto border-b px-3 py-2 lg:hidden">
        <StatusMenu view={view} onChange={setView} />
        <ScopeFilters org={org} className="shrink-0 gap-1.5" />
        <TimeRangeMenu chip search={search} onChange={go} />
      </div>

      {list.isPending ? (
        <SkeletonRows />
      ) : list.isError ? (
        <Screen title="The issues didn't load">
          <Button onClick={() => void list.refetch()}>Try again</Button>
        </Screen>
      ) : rows.length === 0 ? (
        <Screen title={filtered ? 'No issues match' : 'Nothing unresolved'}>
          {filtered && <Button onClick={() => void navigate({ to: '/$org/issues', params: { org }, search: {} })}>Show unresolved issues</Button>}
        </Screen>
      ) : (
        <>
          <div className={cn('grid items-end border-b py-3 pr-3 pl-3 lg:pr-4 lg:pl-0', COLUMNS)}>
            <span className="max-lg:hidden" />
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span>
                <span className="font-mono text-2xl font-semibold lg:text-3xl">{hits}</span> {hits === '1' ? 'issue' : 'issues'}
              </span>
              {groups
                .filter((group) => group.trend !== Trend.ongoing)
                .map((group) => (
                  <span key={group.trend} className={group.color}>
                    <span className="mono font-semibold">{group.rows.length}</span> {group.label.toLowerCase()}
                  </span>
                ))}
            </p>
            <ReleaseTrace buckets={totals} marks={marks} height={36} className="max-lg:hidden lg:mx-4" />
            <span className="mono col-span-4 pb-px text-muted-foreground max-lg:hidden">
              peak {compact(Math.max(...totals, 0))}/{unit.unit}
            </span>
          </div>

          <div className={cn('sticky top-11 z-10 grid h-9 items-center border-b bg-background pr-4 max-lg:hidden', COLUMNS)}>
            {canWrite ? (
              <Checkbox
                hit
                className="mx-auto"
                checked={everyLoaded ? true : selecting ? 'indeterminate' : false}
                onCheckedChange={() => (everyLoaded ? selection.clear() : selection.set(loadedIds))}
                aria-label="Select all"
              />
            ) : (
              <span />
            )}
            <span className="label-caps">Issue</span>
            <span className="label-caps mx-4 flex items-center justify-between">
              <span>{axisStartLabel(period, axis.start)}</span>
              <span className="flex items-center gap-2">
                Events / {unit.unit}
                <PeriodToggle period={period} onChange={setPeriod} />
              </span>
              <span>{unit.now}</span>
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
                    view={view}
                    canWrite={canWrite}
                    selected={selection.ids.has(row.issue.id)}
                    current={cursor === row.issue.id}
                    unfolded={unfolded === row.issue.id}
                    handlers={handlers}
                  />
                ))}
              </ul>
            </section>
          ))}
          <div ref={observe} className="grid h-14 place-items-center">
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
          {canSelectAllMatching && (
            <button type="button" onClick={selection.selectAllMatching} className="flex h-11 w-full items-center justify-center border-b text-sm text-brand">
              Select all {hits} matching
            </button>
          )}
          <div className="flex h-14 items-center gap-1.5 px-1.5">
            <Button variant="ghost" size="icon-touch" onClick={selection.clear} aria-label="Clear selection">
              <X />
            </Button>
            <span className="mr-auto font-medium">
              <span className="mono">{count}</span> selected
            </span>
            {offered.slice(0, 2).map((action, index) => (
              <Button key={action.status} size="touch" variant={index === 0 ? 'default' : 'outline'} onClick={() => setStatus(action.status)}>
                {action.action}
              </Button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-touch" aria-label="More actions">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                {offered.slice(2).map((action) => (
                  <DropdownMenuItem key={action.status} onSelect={() => setStatus(action.status)}>
                    {action.action}
                  </DropdownMenuItem>
                ))}
                {canAssign && <DropdownMenuItem onSelect={assign}>Assign</DropdownMenuItem>}
                {canMerge && <DropdownMenuItem onSelect={() => setMerging(true)}>Merge</DropdownMenuItem>}
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
          selection.clear()
        }}
      />
      <DeleteIssuesDialog
        open={!!deleting}
        what={`${count} ${noun}`}
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) void actions.remove(deleting)
          selection.clear()
        }}
      />
      <ConfirmDialog
        open={merging && canMerge}
        title={`Merge ${count} issues?`}
        detail={
          <>
            They become one issue. <span className="mono">{survivor?.issue.shortId}</span>, the newest, stays and takes the others' events.
          </>
        }
        confirm={`Merge ${count} issues`}
        onClose={() => setMerging(false)}
        onConfirm={() => {
          void actions.merge(selectedIds)
          selection.clear()
        }}
      />
    </>
  )
}
