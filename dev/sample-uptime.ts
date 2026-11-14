// Uptime monitors, alert rules and a status page for the demo organization, and the check history
// dev/uptime-history.py gives the monitors. The backend refuses private or internal targets, so the
// monitors point at public reserved hosts; the backend checks them for real from then on.
// Alert recipients use reserved `.example` hosts, so a test alert never reaches anyone.

const HOUR = 60
const DAY = 24 * HOUR

// When a monitor went down (minutes ago), for how long (none: still down), and why (the backend's reason number).
type Outage = { ago: number; lasts?: number; reason: number }
type History = { base?: number; spread?: number; spikes?: number; outages?: Outage[] }

export const MONITORS: { body: Record<string, unknown>; project: string | null; history?: History }[] = [
  {
    // Down now: the host answers, but not with 200.
    body: { name: 'Checkout API', monitorType: 'GET', url: 'https://example.com/api/checkout/health', expectedStatus: 200, expectedBody: '', interval: 300, timeout: 5 },
    project: 'payments-api',
    history: { base: 140, spread: 60, outages: [{ ago: 14, reason: 2 }, { ago: 3 * DAY + 2 * HOUR, lasts: 41, reason: 2 }, { ago: 9 * DAY, lasts: 8, reason: 1 }] },
  },
  {
    // Flapping, and slow as well.
    body: { name: 'Search', monitorType: 'GET', url: 'https://example.org/', expectedStatus: 200, expectedBody: 'Example Domain', interval: 300, timeout: 5 },
    project: 'web-app',
    history: {
      base: 2600,
      spread: 900,
      spikes: 0.1,
      outages: [
        { ago: 40, lasts: 10, reason: 1 },
        { ago: 2 * HOUR + 10, lasts: 5, reason: 1 },
        { ago: 7 * HOUR, lasts: 10, reason: 1 },
        { ago: 4 * DAY, lasts: 15, reason: 1 },
        { ago: 11 * DAY, lasts: 20, reason: 1 },
      ],
    },
  },
  {
    // Slow: a typical answer takes more than half the timeout.
    body: { name: 'Docs', monitorType: 'GET', url: 'https://example.net/', expectedStatus: 200, expectedBody: '', interval: 300, timeout: 2 },
    project: 'web-app',
    history: { base: 1150, spread: 300, outages: [{ ago: 5 * DAY, lasts: 25, reason: 5 }] },
  },
  {
    body: { name: 'Marketing site', monitorType: 'GET', url: 'https://example.com/', expectedStatus: 200, expectedBody: 'Example Domain', interval: 300, timeout: 20 },
    project: 'web-app',
    history: { base: 80, spread: 30, outages: [{ ago: 6 * DAY, lasts: 70, reason: 4 }] },
  },
  {
    body: { name: 'Edge TLS port', monitorType: 'TCP Port', url: 'example.com:443', expectedStatus: null, expectedBody: '', interval: 300, timeout: 5 },
    project: null,
    history: { base: 12, spread: 6 },
  },
  {
    // A job that calls in every hour, and has stopped.
    body: { name: 'Nightly export', monitorType: 'Heartbeat', url: '', expectedStatus: null, expectedBody: '', interval: 3600, timeout: null },
    project: 'payments-api',
    history: { outages: [{ ago: 50, reason: 0 }, { ago: 5 * DAY, lasts: 3 * HOUR, reason: 0 }] },
  },
  {
    // Has not called in yet.
    body: { name: 'Daily report', monitorType: 'Heartbeat', url: '', expectedStatus: null, expectedBody: '', interval: 86400, timeout: null },
    project: 'web-app',
  },
]

export const ALERTS: Record<string, Record<string, unknown>[]> = {
  'web-app': [
    {
      name: 'Error burst',
      timespanMinutes: 5,
      quantity: 10,
      uptime: false,
      alertRecipients: [
        { recipientType: 'email', url: '' },
        { recipientType: 'slack', url: 'https://hooks.slack.example/services/T000/B000/web-oncall' },
      ],
    },
    { name: 'Downtime', timespanMinutes: null, quantity: null, uptime: true, alertRecipients: [{ recipientType: 'discord', url: 'https://discord.example/api/webhooks/1/ops' }] },
  ],
  'payments-api': [
    {
      name: 'Downtime and spikes',
      timespanMinutes: 10,
      quantity: 50,
      uptime: true,
      environments: ['production'],
      alertRecipients: [
        { recipientType: 'email', url: '' },
        { recipientType: 'teams', url: 'https://payments.webhook.office.example/webhookb2/4c1f/payments' },
      ],
    },
  ],
}

export const STATUS_PAGE = { name: 'Demo Co status', isPublic: true, monitors: ['Checkout API', 'Search', 'Docs', 'Marketing site'] }

// What dev/uptime-history.py reads from SEED_UPTIME.
export const uptimeHistory = () => ({
  monitors: Object.fromEntries(MONITORS.flatMap((monitor) => (monitor.history ? [[monitor.body.name, monitor.history]] : []))),
  statusPages: { [STATUS_PAGE.name]: STATUS_PAGE.monitors },
})
