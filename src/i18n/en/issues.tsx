import type { ReactNode } from 'react'
import { plural } from '../format'

// The issues area: the inbox, an issue's page, search help, bulk actions and comments.
export const issues = {
  issue: 'Issue',
  // "1 issue", "3 issues"; `#` is the count, which may be worded (`1000+`).
  issueCount: (count: number | string) => plural(count, { one: '# issue', other: '# issues' }),
  // The word alone, for a count shown apart from it in a larger type.
  issueNoun: (count: number) => plural(count, { one: 'issue', other: 'issues' }),
  eventCount: (count: number | string) => plural(count, { one: '# event', other: '# events' }),

  // Each view of the inbox by name, as the palette lists them; the page's own title for the default view is plain "Issues".
  views: { unresolved: 'Unresolved issues', resolved: 'Resolved issues', ignored: 'Ignored issues', all: 'All issues' },
  heading: 'Issues',

  status: {
    label: 'Status',
    unresolved: { label: 'Unresolved', action: 'Unresolve' },
    resolved: { label: 'Resolved', action: 'Resolve' },
    ignored: { label: 'Ignored', action: 'Ignore' },
    all: 'All',
    resolvedIn: (release: string) => `Resolved in ${release}`,
    resolvedInNext: 'Resolved in next release',
  },
  assign: 'Assign',
  merge: 'Merge',
  resolveNext: 'Resolve in next release',
  moreWaysToResolve: 'More ways to resolve',

  inbox: {
    loading: 'Loading issues',
    failed: "The issues didn't load",
    noMatch: 'No issues match',
    nothingUnresolved: 'Nothing unresolved',
    showUnresolved: 'Show unresolved issues',
    loadMore: 'Load more',
    selectAll: 'Select all',
    columns: { issue: 'Issue', events: 'Events', seen: 'Seen', assignee: 'Assignee' },
    // Wide enough for the events and seen headers and the seen column's age line.
    columnWidths: { events: '64px', seen: '80px' },
    // The count of each trend that is not the usual one, in the head of the list.
    trends: {
      new: { heading: 'New', word: (_count: number) => 'new' },
      spiking: { heading: 'Spiking', word: (_count: number) => 'spiking' },
      ongoing: { heading: 'Ongoing', word: (_count: number) => 'ongoing' },
    },
    merging: {
      title: (what: string) => `Merge ${what}?`,
      detail: (survivor: ReactNode) => <>They become one issue. {survivor}, the newest, stays and takes the others' events.</>,
      confirm: (what: string) => `Merge ${what}`,
    },
    // Each period a chart can show: its toggle, its unit and what the axis ends on.
    period: 'Period',
    periods: {
      '24h': { label: '24h', unit: 'hour', now: 'Now' },
      '14d': { label: '14d', unit: 'day', now: 'Today' },
    },
    eventsPer: (unit: string) => `Events / ${unit}`,
    peak: (count: string, unit: string) => `peak ${count}/${unit}`,
  },

  row: {
    select: (shortId: string) => `Select ${shortId}`,
    details: 'Details',
    detailsOf: (shortId: string) => `Details of ${shortId}`,
    // The phone's line under the title, in parts joined by `·`; a part never breaks across lines.
    summary: (seen: string, age: string, events: string) => [`seen ${seen}`, `${age} old`, events],
    age: (age: string) => `${age} old`,
    lastSeenAt: (moment: string) => `Last seen ${moment}`,
    firstSeenAt: (moment: string) => `First seen ${moment}`,
    assignedChange: (name: string) => `Assigned to ${name}. Change`,
  },

  dossier: {
    where: 'Where',
    open: 'Open',
    threw: 'threw',
    firstSeen: 'first seen',
    lastSeen: 'last seen',
  },

  search: {
    label: 'Search issues',
    syntax: 'Search syntax',
    meanings: {
      status: 'also is:resolved, is:ignored',
      // The levels are the search syntax's own words.
      level: 'fatal, error, warning, info, debug, sample',
      tag: 'any tag as key:value',
      has: 'issues with that tag set',
      prefix: 'text starting with the word',
      text: 'free text, after any filters',
    },
    words: 'words',
    rule: 'Every part must match. There is no OR or NOT.',
    sort: 'Sort',
    sorts: {
      '-last_seen': 'Last seen',
      last_seen: 'Least recently seen',
      '-first_seen': 'Newest',
      first_seen: 'Oldest',
      '-count': 'Most events',
      count: 'Fewest events',
      '-priority': 'Highest priority',
      priority: 'Lowest priority',
    },
    firstSeen: 'First seen',
    anyTime: 'Any time',
    customRange: 'Custom range',
    ranges: { 'now-1h': 'Last hour', 'now-1d': 'Last 24 hours', 'now-7d': 'Last 7 days', 'now-14d': 'Last 14 days', 'now-30d': 'Last 30 days' },
    last: {
      minute: (count: number) => `Last ${plural(count, { one: '# minute', other: '# minutes' })}`,
      hour: (count: number) => `Last ${plural(count, { one: '# hour', other: '# hours' })}`,
      day: (count: number) => `Last ${plural(count, { one: '# day', other: '# days' })}`,
    },
    since: (when: string) => `Since ${when}`,
    before: (when: string) => `Before ${when}`,
    firstSeenBetween: 'First seen between',
    from: 'From',
    to: 'To',
    apply: 'Apply',
    incompleteDate: 'Add a time, or clear the date.',
    pickOne: 'Pick a start or an end.',
    endAfterStart: 'The end must come after the start.',
  },

  selection: {
    label: 'Selection',
    clear: 'Clear selection',
    // `many` is false only for one issue.
    selected: (count: ReactNode, _many: boolean) => <>{count} selected</>,
    selectAllMatching: (count: string) => `Select all ${count} matching`,
    moreActions: 'More actions',
    // An action and what it covers: "Resolve 3 issues".
    applyTo: (action: string, what: string) => `${action} ${what}`,
    deleteWhat: (what: string) => `Delete ${what}`,
  },

  assignDialog: {
    title: 'Assign',
    to: 'Assign to',
    current: 'current',
    unassign: 'Unassign',
    unassigned: 'Unassigned',
    assignedTo: (name: string) => `Assigned to ${name}`,
  },

  deleteDialog: {
    title: (what: string) => `Delete ${what}?`,
    detail: "The events are deleted too. This can't be undone.",
    confirm: (what: string) => `Delete ${what}`,
  },

  page: {
    facts: { events: 'Events', users: 'Users', firstSeen: 'First seen', lastSeen: 'Last seen' },
    fact: (label: string, value: string) => `${label} ${value}`,
    notFound: 'Issue not found',
    failed: "This issue didn't load",
    eventFailed: "This event didn't load.",
    loading: 'Loading issue',
    more: 'More',
    copyLink: 'Copy link',
    rawEvent: 'Raw event',
    deleteIssue: 'Delete issue',
    event: 'Event',
    copyForAi: 'Copy for AI',
    olderEvent: 'Older event',
    newerEvent: 'Newer event',
    latestEvent: 'Latest event',
    message: 'Message',
    commands: { copyEventForAi: 'Copy event for AI', openRawEvent: 'Open raw event' },
    linkCopied: 'Link copied',
  },

  notices: {
    copiedForAi: 'Copied for AI',
    copiedMcp: 'Copied. Let your agent read events directly with MCP.',
    setUpMcp: 'Set up MCP',
    undo: 'Undo',
    resolvedAsOf: (release: string) => `Resolved as of release ${release}.`,
    resolvedNoRelease: 'Resolved. No release was found to tie it to.',
  },

  // What failed, in "Couldn't {action}". `many` is true for more than one issue.
  actions: {
    update: (many: boolean): string => (many ? 'update the issues' : 'update the issue'),
    assign: (many: boolean): string => (many ? 'assign the issues' : 'assign the issue'),
    delete: (many: boolean): string => (many ? 'delete the issues' : 'delete the issue'),
    resolve: 'resolve the issue',
    unresolve: 'unresolve the issue',
    merge: 'merge the issues',
    copyEvent: 'copy the event',
    copyLink: 'copy the link',
    addComment: 'add the comment',
    saveComment: 'save the comment',
    deleteComment: 'delete the comment',
    splitFingerprints: 'split off the fingerprints',
  },

  comments: {
    title: 'Comments',
    someone: 'Someone',
    delete: 'Delete comment',
    edit: 'Edit comment',
    add: 'Add a comment',
    submit: 'Comment',
  },

  // The sections of the event and the issue's side rail.
  sections: {
    whatHappened: 'What happened',
    earlierSteps: (count: number) => plural(count, { one: '# earlier step', other: '# earlier steps' }),
    // After a file's name: the function it was in.
    in: (name: string) => `in ${name}`,
    // After a time: the release it was in.
    inRelease: (name: string) => `in ${name}`,
    request: 'Request',
    query: 'Query',
    headers: 'Headers',
    cookies: 'Cookies',
    body: 'Body',
    csp: 'CSP report',
    additionalData: 'Additional data',
    tags: 'Tags',
    user: 'User',
    sdk: 'SDK',
    // The headings of the contexts SDKs send under these names; any other context is headed by its own name.
    contexts: { app: 'App', browser: 'Browser', culture: 'Culture', device: 'Device', gpu: 'GPU', os: 'OS', response: 'Response', runtime: 'Runtime', trace: 'Trace' },
    userReports: 'User reports',
    anonymous: 'Anonymous',
    openEvent: (who: string) => `${who}, open event`,
    mergedFingerprints: 'Merged fingerprints',
    selectFingerprint: (id: string) => `Select fingerprint ${id}`,
    splitOff: (count: number) => `Split off ${count}`,
    oneStays: 'One fingerprint has to stay.',
    other: 'other',
    more: (count: number) => `${count} more`,
    showFewer: 'Show fewer',
    openInNewTab: (url: string) => `Open ${url} in a new tab`,
    openInNewTabTitle: 'Open in a new tab',
    // The time of a step before the error, in seconds: `-1.2s`.
    secondsBefore: (seconds: string) => `-${seconds}s`,
    seconds: (seconds: string) => `${seconds}s`,
  },

  stackTrace: {
    title: 'Stack trace',
    view: 'View',
    views: { full: 'Full', raw: 'Raw' },
    order: 'Frame order',
    orders: { newest: 'Newest first', oldest: 'Oldest first' },
    causedBy: 'caused by ',
    handled: 'handled',
    unhandled: 'unhandled',
    libraryFrames: (count: number) => plural(count, { one: '# library frame', other: '# library frames' }),
  },

  levels: { fatal: 'fatal', error: 'error', warning: 'warning', info: 'info', debug: 'debug' },
}
