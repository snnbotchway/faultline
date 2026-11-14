import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowDownWideNarrow } from 'lucide-react'
import { ProjectMenu } from '@/components/project-menu'
import { SearchField } from '@/components/search-field'
import { CommandGroup, useCommands } from '@/components/shell/commands'
import { PageBar, Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { compact, plural } from '@/features/issues/format'
import { useHotkeys } from '@/lib/hotkeys'
import { isDesktop } from '@/lib/layout'
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
const measureOf = (order: ReturnType<typeof transactionSort>): Measure =>
  order?.includes('avg_duration') ? Measure.duration : order?.includes('count') ? Measure.requests : Measure.time

const VIEWS: { view: View; label: string; test?: (transaction: Transaction) => boolean }[] = [
  { view: View.all, label: 'All' },
  { view: View.repeated, label: 'Repeated queries' },
  { view: View.slower, label: 'Slower this week', test: (transaction) => !!transaction.slower },
  { view: View.failing, label: 'Failing', test: (transaction) => transaction.failing },
]

const matches = (repeat: Repeat, query: string | undefined) => {
  const text = query?.toLowerCase()
  return !text || repeat.description.toLowerCase().includes(text) || repeat.transactionName.toLowerCase().includes(text)
}

function sortRepeats(repeats: Repeat[], order: RepeatOrder | undefined) {
  if (order === RepeatOrder.share) return [...repeats].sort((a, b) => b.share - a.share)
  if (order === RepeatOrder.total) return [...repeats].sort((a, b) => b.totalTime - a.totalTime)
  return repeats
}

type Go = (patch: Partial<PerformanceSearch>) => void

// What to look at: everything, the queries that repeat, or the transactions with a problem. One row
// that scrolls sideways when it does not fit.
function Views({ org, search, counts, go }: { org: string; search: PerformanceSearch; counts: Record<View, number>; go: Go }) {
  const current = search.view ?? View.all
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b px-3 py-2 [scrollbar-width:none] md:px-4">
      <nav className="flex shrink-0 items-center gap-1" aria-label="Show">
        {VIEWS.map(({ view, label }) => {
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
              className={cn('flex h-7 shrink-0 items-center gap-2 border px-3 text-sm max-lg:h-11', on ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-accent')}
            >
              {label} <span className={cn('mono', !on && 'text-muted-foreground')}>{counts[view]}</span>
            </Link>
          )
        })}
      </nav>
      <ProjectMenu org={org} project={search.project?.[0]} onChange={(project) => go({ project: project === undefined ? undefined : [project], group: undefined, pattern: undefined })} className="lg:ml-auto" />
    </div>
  )
}

function SortMenu({ orders, order, onChange }: { orders: { value: string; label: string }[]; order: string | undefined; onChange: (order: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="ml-auto min-w-0 max-lg:h-11" aria-label="Sort">
          <ArrowDownWideNarrow />
          <span className="truncate">{orders.find((item) => item.value === (order ?? DEFAULT_ORDER))?.label}</span>
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

const HEADINGS: Record<Measure, [string, string]> = {
  [Measure.time]: ['Share of time spent', 'Total, all time'],
  [Measure.duration]: ['Typical to slow', 'Slow, all time'],
  [Measure.requests]: ['Requests', 'All time'],
}

function TransactionRow({ org, transaction, measure, peak, current, onOpen }: { org: string; transaction: Transaction; measure: Measure; peak: number; current: boolean; onOpen: () => void }) {
  const { group } = transaction
  const p50 = group.p50 ?? 0
  const p95 = group.p95 ?? 0
  const figure = { [Measure.time]: formatMs(transaction.totalTime), [Measure.duration]: formatMs(p95), [Measure.requests]: compact(group.count) }[measure]
  const length = measure === Measure.time ? transaction.share / peak : group.count / peak
  return (
    <li className="border-b">
      <Link
        to="/$org/performance/transaction-groups/$groupId"
        params={{ org, groupId: String(group.id) }}
        onClick={(event) => {
          // A desktop has room for the transaction beside the list.
          if (!isDesktop() || event.metaKey || event.ctrlKey || event.shiftKey) return
          event.preventDefault()
          onOpen()
        }}
        aria-current={current ? 'true' : undefined}
        className={cn('block px-3 py-3 md:px-4', current ? 'lg:bg-selected' : 'hover:bg-accent/60')}
      >
        <span className="flex items-baseline gap-3">
          <TransactionName group={group} className="break-words lg:truncate" />
          <span className="mono ml-auto shrink-0 font-semibold tabular-nums">{figure}</span>
        </span>
        <span className="mt-2 flex items-center gap-3">
          {measure === Measure.duration ? (
            <DurationBar p50={p50} p95={p95} className="flex-1" />
          ) : (
            <span className="relative h-2 flex-1 border-b border-grid" aria-hidden>
              <span className="absolute bottom-0 left-0 h-2 bg-foreground/55" style={{ width: `${Math.max(0.5, length * 100)}%` }} />
            </span>
          )}
          <span className="mono w-14 shrink-0 text-right text-muted-foreground tabular-nums">{measure === Measure.time && formatPercent(transaction.share * 100)}</span>
        </span>
        <span className="mono mt-1 flex flex-wrap gap-x-3 text-muted-foreground">
          {measure !== Measure.requests && <span>{plural(compact(group.count), 'request')}</span>}
          <span>typical {formatMs(p50)}</span>
          {measure !== Measure.duration && <span>slow {formatMs(p95)}</span>}
          {measure !== Measure.time && <span>total {formatMs(transaction.totalTime)}</span>}
          <span>{transaction.project}</span>
        </span>
        <Signals transaction={transaction} className="mt-1" />
      </Link>
    </li>
  )
}

function TransactionList({ org, search, data, rows, go }: { org: string; search: PerformanceSearch; data: Transactions; rows: Transaction[]; go: Go }) {
  const measure = measureOf(transactionSort(search))
  const open = rows.find((row) => String(row.group.id) === search.group) ?? rows[0]
  const peak = measure === Measure.time ? Math.max(...data.transactions.map((item) => item.share), Number.EPSILON) : Math.max(...data.transactions.map((item) => item.group.count), 1)
  const move = (step: number) => {
    const next = rows[Math.max(0, Math.min(rows.length - 1, rows.findIndex((row) => row === open) + step))]
    if (next && isDesktop()) go({ group: String(next.group.id) })
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
        <Screen title="No span details in the last 7 days">
          <SpanStorageHint />
        </Screen>
      ) : (
        <Screen title="Nothing got slower this week" />
      )
    if (view === View.failing) return <Screen title="No transaction is failing" />
    return <Screen title="No project has sent transactions yet" />
  }
  const [left, right] = HEADINGS[measure]
  return (
    <div className="flex flex-1 items-start">
      <div className="min-w-0 flex-1 lg:max-w-[46%] lg:border-r">
        <div className="border-b px-3 py-2 md:px-4">
          <div className="flex items-end justify-between gap-3">
            <span className="label-caps">{left}</span>
            <span className="label-caps shrink-0 text-right">{right}</span>
          </div>
          {/* Clear of the rows' right-hand column, so the scale lines up with their bars. */}
          {measure === Measure.duration && <DurationScale className="mt-1 mr-17" />}
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
              onOpen={() => go({ group: String(transaction.group.id) })}
            />
          ))}
        </ul>
      </div>
      {open && (
        <aside className="sticky top-11 hidden h-[calc(100dvh-2.75rem)] min-w-0 flex-1 overflow-y-auto lg:block" aria-label="Transaction">
          <TransactionPane org={org} groupId={String(open.group.id)} key={open.group.id} />
        </aside>
      )}
    </div>
  )
}

export function Performance({ org, search }: { org: string; search: PerformanceSearch }) {
  useTitle('Performance')
  const navigate = useNavigate()
  const data = useTransactions(org, search)
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
  const counts: Record<View, number> = {
    [View.all]: data.transactions.length,
    [View.repeated]: repeats.length,
    [View.slower]: data.transactions.filter((item) => item.slower).length,
    [View.failing]: data.transactions.filter((item) => item.failing).length,
  }
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
      <PageBar className="max-lg:h-auto max-lg:flex-wrap max-lg:gap-y-0 max-lg:pb-2">
        <h1 className="shrink-0 font-semibold max-lg:flex max-lg:h-11 max-lg:items-center">Performance</h1>
        <SearchField
          key={`${repeated} ${search.query}`}
          query={search.query}
          label={repeated ? 'Search queries' : 'Search transactions'}
          onSubmit={(query) => go({ query, group: undefined, pattern: undefined })}
          className="max-lg:order-last max-lg:basis-full lg:max-w-md"
        />
        <SortMenu
          orders={repeated ? REPEATED_ORDERS : TRANSACTION_ORDERS}
          order={order}
          onChange={(value) => go({ order: [...SORTS, ...REPEAT_ORDERS].find((item) => item.value === value)?.value, group: undefined, pattern: undefined })}
        />
      </PageBar>
      <Views org={org} search={search} counts={counts} go={go} />
      {data.loading ? (
        <SkeletonRows />
      ) : data.denied ? (
        <Screen title="You can't see performance in this organization" />
      ) : data.failed ? (
        <Screen title="The transactions didn't load">
          <Button onClick={data.retry}>Try again</Button>
        </Screen>
      ) : repeated ? (
        <RepeatedQueries org={org} search={search} repeats={repeats} noSpanData={data.noSpanData} go={go} />
      ) : (
        <TransactionList org={org} search={search} data={data} rows={rows} go={go} />
      )}
    </>
  )
}
