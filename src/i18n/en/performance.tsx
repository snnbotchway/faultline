import type { ReactNode } from 'react'
import { plural } from '../format'

// Performance: the transactions list, a transaction's page, and the repeated queries.
export const performance = {
  transaction: 'Transaction',
  transactions: 'Transactions',
  loading: 'Loading',
  all: 'All',
  allTime: 'All time',
  askAdmin: 'Ask your admin to turn on request details.',
  noDetails: 'No request details in the last 7 days',
  clearSearch: 'Clear the search',
  searchTransactions: 'Search transactions',
  searchQueries: 'Search queries',
  sort: 'Sort',
  allTransactions: 'All transactions',

  // "1 request", "1.2k requests": a count already shortened (`1.2k`) is worded as it is.
  requests: (count: number | string) => plural(count, { one: '# request', other: '# requests' }),
  typical: (time: string) => `typical ${time}`,
  slow: (time: string) => `slow ${time}`,
  total: (time: string) => `total ${time}`,
  perRequest: (times: string) => `${times} per request`,
  each: (time: string) => `${time} each`,

  // A duration: `4.2 ms`, `7.46 s`, `2m 54s`, `1h 5m`. The numbers arrive written for the language.
  duration: {
    milliseconds: (value: string) => `${value} ms`,
    seconds: (value: string) => `${value} s`,
    minutes: (minutes: number, seconds: number) => `${minutes}m ${seconds}s`,
    hours: (hours: number, minutes: number) => `${hours}h ${minutes}m`,
  },

  // "2.2× slower since 1.4.0", "2.2× slower this week": `factor` is the figure, set apart from the words.
  slower: (factor: ReactNode, since: string | undefined) => (since ? <>{factor} slower since {since}</> : <>{factor} slower this week</>),
  queryRepeats: (times: ReactNode) => <>Query repeats {times}</>,
  failedShare: (share: ReactNode) => <>{share} failed</>,
  // The last day's label on the chart's axis, where a phone leaves room for about five characters.
  todayShort: 'Today',
  weekChart: (days: number, peak: string) => `Time per request for each of the last ${days} days, peak ${peak}`,

  // The tabs. `short` is the one on a phone, where all four have to fit across.
  views: {
    all: { label: 'All', short: 'All' },
    repeated: { label: 'Repeated queries', short: 'Repeated' },
    slower: { label: 'Slower this week', short: 'Slower' },
    failing: { label: 'Failing', short: 'Failing' },
  },
  mostTimeSpent: 'Most time spent',
  mostRepeated: 'Most repeated',
  sorts: {
    '-avg_duration': 'Slowest',
    avg_duration: 'Fastest',
    '-count': 'Most requests',
    count: 'Fewest requests',
    '-created': 'Newest',
  },
  repeatOrders: { share: 'Largest share of request', total: 'Most time spent' },
  // The labels above the rows, left and right, for each way of ordering.
  headings: {
    time: { left: 'Share of time spent', right: 'Total, all time' },
    duration: { left: 'Typical to slow', right: 'Slow, all time' },
    requests: { left: 'Requests', right: 'All time' },
  },

  empty: {
    noMatch: 'No transactions match',
    nothingSlower: 'Nothing got slower this week',
    nothingFailing: 'No transaction is failing',
    noTransactions: 'No project has sent transactions yet',
    noRepeatsMatch: 'No repeated queries match',
    noRepeats: 'No query repeated in the last 7 days',
  },
  errors: {
    denied: "You can't see performance in this organization",
    transactions: "The transactions didn't load",
    repeats: "The repeated queries didn't load",
    slower: "Slower transactions didn't load",
    transactionMissing: 'This transaction no longer exists',
    transactionDenied: "You can't see this transaction",
    transaction: "This transaction didn't load",
  },

  detail: {
    stats: { typical: 'Typical', slow: 'Slow', average: 'Average', requests: 'Requests', failed: 'Failed' },
    sharedName: (name: ReactNode) => <>The chart and breakdown also count the other transactions named {name}.</>,
    timePerRequest: 'Time per request, 7 days',
    averageRequest: 'Average request, 7 days',
    kindOfSpan: 'Kind of span',
    parts: 'Parts of a request, largest first',
    repeats: 'Repeats',
    notBrokenDown: 'Not broken down',
  },

  repeated: {
    repeatedQuery: 'Repeated query',
    runsPerRequest: 'Runs per request, 7 days',
    timePerRequest: 'Time per request',
    where: (name: ReactNode) => <>in {name}</>,
    oneRequest: 'One request',
    // The query's time in one request, then the whole request's, when it is known.
    ofRequest: (part: ReactNode, whole: string | undefined) => (whole === undefined ? part : <>{part} of {whole}</>),
    sharedUnknown: 'More than one transaction has this name, so its share of a request is unknown.',
    shareOfRequest: 'Share of request',
    eachRun: 'Each run',
    requests7: 'Requests, 7 days',
    total7: 'Total, 7 days',
    openTransaction: 'Open transaction',
  },
}
