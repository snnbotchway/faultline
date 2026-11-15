import { StatsPeriod } from '@/api/issues'
import type { ReactNode } from 'react'
import { count as number, plural, type PluralForms } from '../format'

export const IntervalUnit = { day: 'day', hour: 'hour', minute: 'minute', second: 'second' } as const
export type IntervalUnit = (typeof IntervalUnit)[keyof typeof IntervalUnit]

const INTERVAL: Record<IntervalUnit, PluralForms> = {
  day: { one: 'day', other: '# days' },
  hour: { one: 'hour', other: '# hours' },
  minute: { one: 'minute', other: '# minutes' },
  second: { one: 'second', other: '# seconds' },
}

const EVERY: Record<IntervalUnit, PluralForms> = {
  day: { one: 'every day', other: 'every # days' },
  hour: { one: 'every hour', other: 'every # hours' },
  minute: { one: 'every minute', other: 'every # minutes' },
  second: { one: 'every second', other: 'every # seconds' },
}

// Monitors and their status pages: the list, a monitor's page, the form that adds or changes one, and the status pages.
export const uptime = {
  title: 'Uptime',
  monitorsHeading: 'Uptime monitors',
  monitor: 'Monitor',
  newMonitor: 'New monitor',
  now: 'Now',
  tabs: { label: 'Uptime', monitors: 'Monitors', statusPages: 'Status pages' },

  // `label` names a health; `inline` describes one monitor; `counted` follows a count ("2 down"); `headline` is a monitor's title.
  health: {
    down: { counted: (_count: number) => 'down', label: 'Down', inline: 'down', headline: (name: string) => `${name} is down` },
    flapping: { counted: (_count: number) => 'flapping', label: 'Flapping', inline: 'flapping', headline: (name: string) => `${name} is flapping` },
    slow: { counted: (_count: number) => 'slow', label: 'Slow', inline: 'slow', headline: (name: string) => `${name} is slow` },
    up: { counted: (_count: number) => 'up', label: 'Up', inline: 'up', headline: (name: string) => `${name} is up` },
    waiting: { counted: (_count: number) => 'waiting', label: 'Waiting', inline: 'waiting', headline: (name: string) => `${name} has not reported yet` },
  },
  downNow: 'Down now',
  recovered: 'Recovered',

  // Why a check failed, in the user's words.
  reasons: {
    unknown: 'No answer',
    timeout: 'Timed out',
    status: 'Wrong status',
    body: 'Text not found',
    certificate: 'Certificate problem',
    network: "Couldn't connect",
  },
  noHeartbeat: 'No heartbeat',
  noHeartbeatYet: 'No heartbeat yet',
  // `every` is the phrase from `every()` below: "every hour".
  heartbeatEvery: (every: string) => `Heartbeat ${every}`,
  noCheckYet: 'No check yet',
  // `since` is how long ago the state began (`14m`), empty when unknown.
  downSince: (since: string, reason: string) => `${since ? `Down ${since}` : 'Down'} · ${reason}`,
  flappingSince: (downs: number, when: string) => `Down ${downs} times since ${when}`,
  slowLine: (typical: string, timeout: number) => `${typical} of a ${timeout}s timeout`,
  upSince: (since: string) => (since ? `Up ${since}` : 'Up'),
  seconds: (count: number) => `${count}s`,

  // "minute", "5 minutes": a choice of how often; "every minute", "every 5 minutes": in a sentence.
  interval: (unit: IntervalUnit, count: number) => plural(count, INTERVAL[unit]),
  every: (unit: IntervalUnit, count: number) => plural(count, EVERY[unit]),

  list: {
    failed: "The monitors didn't load",
    empty: 'Add a monitor to see when a site or job goes down',
    waitingGroup: 'Waiting for a first check',
    // The number is shown apart, in its own type.
    monitors: (count: number) => plural(count, { one: 'monitor', other: 'monitors' }),
    allUp: 'all up',
    downtimeSince: (since: string) => `Downtime since ${since}`,
    lastChecks: 'Last 60 checks',
    changed: 'Changed',
    more: 'More monitors',
    loading: 'Loading monitors',
  },

  noAccess: { title: "You can't change monitors in this organization", description: 'Ask an admin of the organization to give you access to its projects.' },

  page: {
    notFound: 'Monitor not found',
    failed: "This monitor didn't load",
    goToUptime: 'Go to uptime',
    loading: 'Loading monitor',
    downtime: 'Downtime',
    inLast: { [StatsPeriod.day]: 'in the last 24 hours', [StatsPeriod.fortnight]: 'in the last 14 days' },
    upShare: (share: ReactNode, inLast: string) => (
      <>
        {share} up {inLast}
      </>
    ),
    upSinceFirst: (share: ReactNode) => <>{share} up since its first check</>,
    downtimeFailed: "The downtime didn't load.",
    waitingNothing: 'Nothing to show until the first check.',
    noDowntime: (inLast: string) => `No downtime ${inLast}.`,
    heartbeatAddress: 'Heartbeat address',
    setup: 'Setup',
    alerts: 'Alerts',
    nobody: 'Nobody',
    nobodyHears: 'Nobody hears when this goes down.',
    addRule: 'Add a rule',
    linkProject: 'Link a project',
    facts: { check: 'Check', status: 'Status', text: 'Text', timeout: 'Timeout', downAfter: 'Down after', environment: 'Environment' },
    failedCount: (count: number) => `${count} failed`,

    lastChecks: (count: number) => plural(count, { one: 'Last check', other: 'Last # checks' }),
    passed: 'Passed',
    response: 'Response',
    slow: 'Slow',
    peak: (time: string) => `peak ${time}`,
    slowOver: (time: string) => `slow over ${time}`,

    wentDown: 'Went down',
    cameBack: 'Came back',
    notYet: 'Not yet',
    releaseBefore: 'Release before',
    alertsGoTo: 'Alerts go to',
    // `release` is a link or its name, `span` how long before the downtime it was made (`6m`).
    earlier: (release: ReactNode, span: ReactNode) => (
      <>
        {release}, {span} earlier
      </>
    ),
    ago: (time: string) => `${time} ago`,
    // The width of the first column of a downtime row, which holds `ago`.
    agoWidth: '64px',
    lasting: (span: string, ongoing: boolean) => (ongoing ? `${span} so far` : span),

    checks: 'Checks',
    showChecks: 'Show checks',
    views: { all: 'All', incidents: 'Incidents only' },
    checksFailed: "The checks didn't load.",
    backToNewest: 'Back to newest',
    noIncidents: 'No incidents recorded.',
    noChecks: 'No checks yet.',
    // `total` is a count, or a worded one such as `1000+`.
    caption: (total: number | string | undefined) => `${total === undefined ? '' : `${plural(total, { one: '# check', other: '# checks' })}, `}newest first`,
    time: 'Time',
    result: 'Result',
    range: (from: number, to: number, total: number | string | undefined) => `${number(from)}–${number(to)}${total === undefined ? '' : ` of ${typeof total === 'number' ? number(total) : total}`}`,
    older: 'Older checks',
    newer: 'Newer checks',
    firstCheck: 'First check',
    wentDownBecause: (reason: string) => `Went down · ${reason}`,
    loadingRows: 'Loading',

    deleteTitle: (name: string) => `Delete ${name}?`,
    deleteDescription: 'Its check history is deleted with it.',
    deleteMonitor: 'Delete monitor',
    deleteAction: 'delete the monitor',
  },

  dialog: {
    ready: (name: string) => `${name} is ready`,
    edit: (name: string) => `Edit ${name}`,
    callEvery: (every: string) => `Call this address ${every}.`,
    openMonitor: 'Open monitor',
    saveMonitor: 'Save monitor',
    createMonitor: 'Create monitor',
    saveAction: 'save the monitor',
    limit: 'This organization has as many monitors as it may have. Delete one to add another.',
    byApi: "This kind of check is set up through the API and can't be changed here.",
    groups: { check: 'Check', expect: 'Expect', schedule: 'Schedule', belongsTo: 'Belongs to' },
    type: 'Type',
    types: { ping: 'Ping', port: 'Port', heartbeat: 'Heartbeat' },
    addressToCall: 'Address to call',
    // The three kinds of address: a URL, a host, and a host with its port.
    address: {
      url: { label: 'URL', missing: 'Enter the URL to check.' },
      host: { label: 'Host', missing: 'Enter the host to check.' },
      hostPort: { label: 'Host and port', missing: 'Enter the host and port to check.' },
    },
    name: 'Name',
    nameMissing: 'Give the monitor a name.',
    hostPortExample: 'Enter a host and port, such as db.example.com:5432.',
    statusExample: 'A status code, such as 200.',
    timeoutRange: (max: number) => `From 1 to ${max}.`,
    status: 'Status',
    pageContains: 'Page contains',
    every: 'Every',
    heartbeatEveryLabel: 'A heartbeat every',
    timeoutSeconds: 'Timeout (seconds)',
    downAfter: 'Down after',
    noProject: 'None (no alerts)',
    environment: 'Environment',
    refused: {
      privateAddress: 'This address is on a private network. Monitors can only check public addresses.',
      badAddress: 'Enter a full address, such as https://example.com/health.',
      badPort: 'Enter a host and port, such as db.example.com:5432.',
    },
  },

  statusPages: {
    title: 'Status pages',
    new: 'New status page',
    failed: "The status pages didn't load",
    empty: 'Make a status page to show others which services are up',
    loading: 'Loading status pages',
    public: 'Public',
    members: 'Members',
    opensInNewTab: 'Opens in a new tab',
    copyLink: 'Copy link',
    noMonitors: 'No monitors yet',
    addMonitors: 'Add monitors',
    adminAdds: 'An admin adds monitors to this page.',
    // `span` is how long it has been down (`14m`).
    downFor: (span: ReactNode) => <>down {span}</>,
    editPage: 'Edit page',
    nameMissing: 'Give the page a name.',
    anyoneWithLink: 'Anyone with the link can see it',
    create: 'Create status page',
    createAction: 'create the status page',
  },
}
