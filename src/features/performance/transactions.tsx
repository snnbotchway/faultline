import { Link, useNavigate } from '@tanstack/react-router'
import type { TransactionSort } from '@/api/performance'
import { ArrowDownWideNarrow } from 'lucide-react'
import { ProjectMenu } from '@/components/project-menu'
import { SearchField } from '@/components/search-field'
import { CommandGroup, useCommands } from '@/components/shell/commands'
import { ListPageBar } from '@/components/list-page-bar'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CountLabel } from '@/components/count-label'
import { compact } from '@/features/issues/format'
import { LOADING, UNAVAILABLE, counted, type Count } from '@/lib/format'
import { plural, valueName } from '@/lib/text'
import { useHotkeys } from '@/lib/hotkeys'
import { isDesktop, openBeside } from '@/lib/layout'
import { useTitle } from '@/lib/title'
import { cn } from '@/lib/utils'
import { useTransactions, type Repeat, type Transaction, type Transactions } from './data'
import { formatMs, formatPercent } from './format'
import { DurationBar, DurationScale, Signals, SkeletonRows, SpanStorageHint, TransactionName } from './parts'
import { RepeatedQueries } from './repeated-queries'
import { REPEAT_ORDERS, RepeatOrder, SORTS, View, repeatOrder, transactionSort, type PerformanceSearch } from './search'
import { TransactionPane } from './transaction'

const DEFAULT_ORDER = ''
const TRANSACTION_ORDERS = [{ value: DEFAULT_ORDER, label: 'Most time spent' }, ...SORTS]
const REPEATED_ORDERS = [{ value: DEFAULT_ORDER, label: 'Most repeated' }, ...REPEAT_ORDERS]

// What a row's bar and figure show, which follows from how the list is ordered.
const Measure = { time: 'time', duration: 'duration', requests: 'requests' } as const
type Measure = (typeof Measure)[keyof typeof Measure]
const MEASURE_OF: Record<TransactionSort, Measure> = {
  avg_duration: Measure.duration,
  '-avg_duration': Measure.duration,
  count: Measure.requests,
  '-count': Measure.requests,
  created: Measure.time,
  '-created': Measure.time,
}
const measureOf = (order: TransactionSort | undefined): Measure => (order ? MEASURE_OF[order] : Measure.time)

const requests = (transaction: Transaction) => plural(compact(transaction.group.count), 'request')
const typical = (transaction: Transaction) => `typical ${formatMs(transaction.group.p50 ?? 0)}`
const slow = (transaction: Transaction) => `slow ${formatMs(transaction.group.p95 ?? 0)}`
const total = (transaction: Transaction) => `total ${formatMs(transaction.totalTime)}`

type MeasureView = {
  // The labels above the rows, left and right.
  headings: [string, string]
  // The row's figure, at the right of its name.
  figure: (transaction: Transaction) => string
  // The row's bar, scaled to the largest in the list. Undefined draws the span from typical to slow instead.
  size: ((transaction: Transaction) => number) | undefined
  // Whether the bar's size is a share, written as a percentage beside it.
  percent: boolean
  // The other figures, under the bar.
  details: ((transaction: Transaction) => string)[]
}

const MEASURES: Record<Measure, MeasureView> = {
  [Measure.time]: {
    headings: ['Share of time spent', 'Total, all time'],
    figure: (transaction) => formatMs(transaction.totalTime),
    size: (transaction) => transaction.share,
    percent: true,
    details: [requests, typical, slow],
  },
  [Measure.duration]: {
    headings: ['Typical to slow', 'Slow, all time'],
    figure: (transaction) => formatMs(transaction.group.p95 ?? 0),
    size: undefined,
    percent: false,
    details: [requests, typical, total],
  },
  [Measure.requests]: {
    headings: ['Requests', 'All time'],
    figure: (transaction) => compact(transaction.group.count),
    size: (transaction) => transaction.group.count,
    percent: false,
    details: [typical, slow, total],
  },
}

// `short` is the tab's label on a phone, where all four have to fit across.
const VIEWS: { view: View; label: string; short: string; test?: (transaction: Transaction) => boolean }[] = [
  { view: View.all, label: 'All', short: 'All' },
  { view: View.repeated, label: 'Repeated queries', short: 'Repeated' },
  { view: View.slower, label: 'Slower this week', short: 'Slower', test: (transaction) => !!transaction.slower },
  { view: View.failing, label: 'Failing', short: 'Failing', test: (transaction) => transaction.failing },
]

const matches = (repeat: Repeat, query: string | undefined) => {
  const text = query?.toLowerCase()
  return !text || repeat.description.toLowerCase().includes(text) || repeat.transactionName.toLowerCase().includes(text)
}

function sortRepeats(repeats: Repeat[], order: RepeatOrder | undefined) {
  if (order === RepeatOrder.share) return [...repeats].sort((a, b) => (b.share ?? -1) - (a.share ?? -1))
  if (order === RepeatOrder.total) return [...repeats].sort((a, b) => b.totalTime - a.totalTime)
  return repeats
}

type Go = (patch: Partial<PerformanceSearch>) => void

// What to look at: everything, the queries that repeat, or the transactions with a problem. One row
// that scrolls sideways when it does not fit.
function Views({ org, search, counts }: { org: string; search: PerformanceSearch; counts: Record<View, Count> }) {
  const current = search.view ?? View.all
  return (
    <div className="scroll-row flex items-center gap-1 border-b px-3 py-2 md:px-4">
      <nav className="flex shrink-0 items-center gap-1" aria-label="Show">
        {VIEWS.map(({ view, label, short }) => {
          const on = view === current
          // The two kinds of list are ordered differently, so an order does not carry from one to the other.
          const keepsOrder = (view === View.repeated) === (current === View.repeated)
          return (
            <Link
              key={view}
              to="/$org/performance/transaction-groups"
              params={{ org }}
              search={{ view: view === View.all ? undefined : view, query: search.query, project: search.project, order: keepsOrder ? search.order : undefined }}
              aria-current={on ? 'page' : undefined}
              className={cn('flex h-7 shrink-0 items-center gap-2 border px-3 text-sm max-lg:h-11 max-lg:px-2', on ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-accent')}
            >
              <span className="max-lg:hidden">{label}</span>
              <span className="lg:hidden">{short}</span>
              <span className={cn('mono', !on && 'text-muted-foreground')}>
                <CountLabel count={counts[view]} />
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

function SortMenu({ orders, order, onChange }: { orders: { value: string; label: string }[]; order: string | undefined; onChange: (order: string) => void }) {
  const label = orders.find((item) => item.value === (order ?? DEFAULT_ORDER))?.label
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="min-w-0 max-lg:size-11 max-lg:px-0" aria-label={valueName('Sort', label)} title={valueName('Sort', label)}>
          <ArrowDownWideNarrow />
          <span className="truncate max-lg:hidden">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={order ?? DEFAULT_ORDER} onValueChange={onChange}>
          {orders.map((item) => (
            <DropdownMenuRadioItem key={item.value} value={item.value}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TransactionRow({ org, transaction, measure, peak, current, onOpen }: { org: string; transaction: Transaction; measure: MeasureView; peak: number; current: boolean; onOpen: () => void }) {
  const { group } = transaction
  return (
    <li className="border-b">
      <Link
        to="/$org/performance/transaction-groups/$groupId"
        params={{ org, groupId: String(group.id) }}
        onClick={(event) => openBeside(event, onOpen)}
        aria-current={current ? 'true' : undefined}
        className={cn('block px-3 py-3 md:px-4', current ? 'lg:bg-selected' : 'hover:bg-accent/60')}
      >
        <span className="flex items-baseline gap-3">
          <TransactionName group={group} className="break-words lg:truncate" />
          <span className="mono ml-auto shrink-0 font-semibold tabular-nums">{measure.figure(transaction)}</span>
        </span>
        <span className="mt-2 flex items-center gap-3">
          {measure.size ? (
            <span className="relative h-2 flex-1 border-b border-grid" aria-hidden>
              <span className="absolute bottom-0 left-0 h-2 bg-foreground/55" style={{ width: `${Math.max(0.5, (measure.size(transaction) / peak) * 100)}%` }} />
            </span>
          ) : (
            <DurationBar p50={group.p50 ?? 0} p95={group.p95 ?? 0} className="flex-1" />
          )}
          <span className="mono w-14 shrink-0 text-right text-muted-foreground tabular-nums">{measure.percent && formatPercent(transaction.share * 100)}</span>
        </span>
        <span className="mono mt-1 flex flex-wrap gap-x-3 text-muted-foreground">
          {measure.details.map((detail, index) => (
            <span key={index}>{detail(transaction)}</span>
          ))}
          <span>{transaction.project}</span>
        </span>
        <Signals transaction={transaction} className="mt-1" />
      </Link>
    </li>
  )
}

function TransactionList({ org, search, data, rows, go }: { org: string; search: PerformanceSearch; data: Transactions; rows: Transaction[]; go: Go }) {
  const measure = MEASURES[measureOf(transactionSort(search))]
  const open = rows.find((row) => row.group.id === search.group) ?? rows[0]
  const { size } = measure
  const peak = size ? Math.max(...data.transactions.map(size), Number.EPSILON) : 1
  const move = (step: number) => {
    const next = rows[Math.max(0, Math.min(rows.length - 1, rows.findIndex((row) => row === open) + step))]
    if (next && isDesktop()) go({ group: next.group.id })
  }
  useHotkeys({ j: () => move(1), k: () => move(-1) })

  if (rows.length === 0) {
    const view = search.view ?? View.all
    if (search.query)
      return (
        <Screen title="No transactions match">
          <Button onClick={() => go({ query: undefined })}>Clear the search</Button>
        </Screen>
      )
    if (view === View.slower)
      return data.noSpanData ? (
        <Screen title="No request details in the last 7 days">
          <SpanStorageHint />
        </Screen>
      ) : (
        <Screen title="Nothing got slower this week" />
      )
    if (view === View.failing) return <Screen title="No transaction is failing" />
    return <Screen title="No project has sent transactions yet" />
  }
  const [left, right] = measure.headings
  return (
    <div className="flex flex-1 items-start">
      <div className="min-w-0 flex-1 lg:max-w-list lg:border-r">
        <div className="border-b px-3 py-2 md:px-4">
          <div className="flex items-end justify-between gap-3">
            <span className="label-caps">{left}</span>
            <span className="label-caps shrink-0 text-right">{right}</span>
          </div>
          {/* Clear of the rows' right-hand column, so the scale lines up with their bars. */}
          {!size && <DurationScale className="mt-1 mr-17" />}
        </div>
        <ul aria-label="Transactions">
          {rows.map((transaction) => (
            <TransactionRow
              key={transaction.group.id}
              org={org}
              transaction={transaction}
              measure={measure}
              peak={peak}
              current={transaction === open}
              onOpen={() => go({ group: transaction.group.id })}
            />
          ))}
        </ul>
      </div>
      {open && (
        <aside className="side-pane hidden min-w-0 flex-1 lg:block" aria-label="Transaction">
          <TransactionPane org={org} groupId={String(open.group.id)} key={open.group.id} />
        </aside>
      )}
    </div>
  )
}

export function Performance({ org, search }: { org: string; search: PerformanceSearch }) {
  useTitle('Performance')
  const navigate = useNavigate()
  // The search box searches queries in that tab, so it does not narrow the transactions they belong to.
  const data = useTransactions(org, search.view === View.repeated ? { ...search, query: undefined } : search)
  const go: Go = (patch) => void navigate({ to: '/$org/performance/transaction-groups', params: { org }, search: { ...search, ...patch }, replace: true })

  const view = search.view ?? View.all
  const repeated = view === View.repeated
  // The backend sorts by duration, requests or age; time spent is ranked here.
  const ordered = transactionSort(search) ? data.transactions : [...data.transactions].sort((a, b) => b.totalTime - a.totalTime)
  const test = VIEWS.find((item) => item.view === view)?.test
  const rows = test ? ordered.filter(test) : ordered
  const repeats = sortRepeats(
    data.repeats.filter((repeat) => matches(repeat, search.query)),
    repeatOrder(search),
  )
  const number = (n: number) => counted({ n, capped: false })
  const counts: Record<View, Count> = {
    [View.all]: number(data.transactions.length),
    [View.repeated]: data.repeatsFailed ? UNAVAILABLE : data.countingRepeats ? LOADING : number(repeats.length),
    [View.slower]: data.slowerFailed ? UNAVAILABLE : data.countingSlower ? LOADING : number(data.transactions.filter((item) => item.slower).length),
    [View.failing]: number(data.transactions.filter((item) => item.failing).length),
  }
  const partFailed = repeated ? data.repeatsFailed : view === View.slower && data.slowerFailed
  const order = repeated ? repeatOrder(search) : transactionSort(search)
  useCommands(
    VIEWS.filter((item) => item.view !== view).map((item) => ({
      id: `show:${item.view}`,
      group: CommandGroup.show,
      label: item.view === View.all ? 'All transactions' : item.label,
      run: () => go({ view: item.view === View.all ? undefined : item.view, order: undefined, group: undefined, pattern: undefined }),
    })),
  )

  return (
    <>
      <ListPageBar title="Performance">
        <SearchField
          key={`${repeated} ${search.query}`}
          query={search.query}
          label={repeated ? 'Search queries' : 'Search transactions'}
          onSubmit={(query) => go({ query, group: undefined, pattern: undefined })}
          className="max-lg:order-last max-lg:basis-full lg:max-w-md"
        />
        <ProjectMenu org={org} value={search.project} onChange={(project) => go({ project, group: undefined, pattern: undefined })} className="ml-auto" />
        <SortMenu
          orders={repeated ? REPEATED_ORDERS : TRANSACTION_ORDERS}
          order={order}
          onChange={(value) => go({ order: [...SORTS, ...REPEAT_ORDERS].find((item) => item.value === value)?.value, group: undefined, pattern: undefined })}
        />
      </ListPageBar>
      <Views org={org} search={search} counts={counts} />
      {data.loading ? (
        <SkeletonRows />
      ) : data.denied ? (
        <Screen title="You can't see performance in this organization" />
      ) : data.failed ? (
        <Screen title="The transactions didn't load">
          <Button onClick={data.retry}>Try again</Button>
        </Screen>
      ) : partFailed ? (
        <Screen title={repeated ? "The repeated queries didn't load" : "Slower transactions didn't load"}>
          <Button onClick={data.retry}>Try again</Button>
        </Screen>
      ) : repeated && data.countingRepeats ? (
        <SkeletonRows />
      ) : repeated ? (
        <RepeatedQueries org={org} search={search} repeats={repeats} noSpanData={data.noSpanData} go={go} />
      ) : (
        <TransactionList org={org} search={search} data={data} rows={rows} go={go} />
      )}
    </>
  )
}
