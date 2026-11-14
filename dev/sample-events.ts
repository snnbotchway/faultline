// Deterministic sample events with two weeks of history, so screenshots and e2e runs see the same shapes:
// issues that are new, spiking and ongoing, one resolved and one ignored.

const DAY = 24 * 3_600_000

// Releases, as days before now. An event carries the newest release that was out when it happened.
export const RELEASES = [
  { version: '1.4.0', daysAgo: 12 },
  { version: '1.4.1', daysAgo: 6 },
  { version: '1.5.0', daysAgo: 2 },
] as const

type Shape =
  // Events per day, oldest first, for the 13 full days before today, then today.
  | { daily: number[] }
  // First seen within the last day: this many events over the last `hours` hours.
  | { recent: number; hours: number }

type SampleError = {
  type: string
  value: string
  fn: string
  file: string
  level?: string
  status?: 'resolved' | 'ignored'
} & Shape

const steady = (...daily: number[]) => ({ daily })

export const ERRORS: Record<string, SampleError[]> = {
  'web-app': [
    // Spiking: a low baseline, then a surge today, after 1.5.0 went out.
    { type: 'TypeError', value: "Cannot read properties of undefined (reading 'premium')", fn: 'renderQuote', file: 'src/quotes/QuoteCard.tsx', ...steady(2, 1, 3, 2, 0, 1, 2, 3, 1, 2, 2, 1, 4, 31) },
    { type: 'ChunkLoadError', value: 'Loading chunk 412 failed.', fn: 'loadRoute', file: 'src/router.ts', ...steady(1, 0, 2, 1, 1, 0, 0, 5, 2, 1, 0, 1, 2, 1) },
    { type: 'RangeError', value: 'Invalid time value', fn: 'formatDate', file: 'src/lib/dates.ts', ...steady(0, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0, 1) },
    { type: 'Warning', value: 'Quote form submitted twice within 300ms', fn: 'submitQuote', file: 'src/quotes/QuoteForm.tsx', level: 'warning', ...steady(3, 4, 2, 5, 1, 0, 3, 4, 4, 2, 3, 1, 2, 2) },
    { type: 'SyntaxError', value: 'Unexpected token < in JSON at position 0', fn: 'loadRates', file: 'src/rates/client.ts', recent: 9, hours: 7 },
    { type: 'ReferenceError', value: 'gtag is not defined', fn: 'trackPageView', file: 'src/analytics.ts', status: 'resolved', ...steady(6, 8, 5, 7, 4, 6, 9, 3, 0, 0, 0, 0, 0, 0) },
  ],
  'payments-api': [
    { type: 'IntegrityError', value: 'duplicate key value violates unique constraint "payment_ref_key"', fn: 'record_payment', file: 'payments/services.py', ...steady(4, 6, 5, 3, 1, 2, 5, 6, 4, 5, 2, 1, 4, 3) },
    // Spiking: the gateway has been timing out since this morning.
    { type: 'TimeoutError', value: 'Mobile money gateway did not respond within 30s', fn: 'charge_mobile_money', file: 'payments/momo.py', ...steady(3, 2, 4, 2, 1, 1, 3, 2, 4, 3, 1, 2, 3, 46) },
    { type: 'KeyError', value: "'policy_number'", fn: 'handle_webhook', file: 'payments/webhooks.py', ...steady(0, 1, 0, 0, 2, 0, 1, 0, 0, 1, 0, 0, 1, 0) },
    { type: 'ValueError', value: 'Premium amount must be positive, got -12.50', fn: 'validate_amount', file: 'payments/validators.py', recent: 4, hours: 18 },
    { type: 'DeprecationWarning', value: 'datetime.utcnow() is deprecated', fn: 'stamp_receipt', file: 'payments/receipts.py', level: 'warning', status: 'ignored', ...steady(12, 14, 11, 13, 6, 5, 12, 13, 12, 14, 7, 5, 12, 4) },
  ],
  mobile: [
    { type: 'NetworkError', value: 'Request failed with status code 503', fn: 'syncClaims', file: 'app/claims/sync.ts', ...steady(2, 3, 1, 2, 4, 5, 2, 1, 3, 2, 5, 4, 2, 2) },
    { type: 'Error', value: 'Biometric prompt was cancelled', fn: 'unlockApp', file: 'app/auth/biometrics.ts', level: 'info', ...steady(1, 0, 1, 1, 2, 1, 0, 1, 1, 0, 2, 1, 1, 0) },
  ],
}

export const titleOf = (error: SampleError) => `${error.type}: ${error.value}`

// Spread without randomness, so two runs give the same picture.
const fraction = (seed: number) => ((seed * 2654435761) % 1000) / 1000

// When each event of an error happened, oldest first.
export function eventTimes(error: SampleError, now: number): number[] {
  const seed = error.fn.length * 31 + error.type.length
  if ('recent' in error) {
    const span = error.hours * 3_600_000
    return Array.from({ length: error.recent }, (_, i) => now - span + ((i + fraction(seed + i) * 0.9) / error.recent) * span)
  }
  const today = Math.floor(now / DAY) * DAY
  const times: number[] = []
  error.daily.forEach((count, index) => {
    const start = today - (error.daily.length - 1 - index) * DAY
    // Today only runs up to now; earlier days are busiest in working hours.
    const [from, length] = start === today ? [start, now - start] : [start + 6 * 3_600_000, 14 * 3_600_000]
    for (let i = 0; i < count; i++) times.push(from + ((i + fraction(seed + index * 17 + i)) / count) * length)
  })
  return times.sort((a, b) => a - b)
}

const BROWSERS = [
  { name: 'Chrome', version: '131' },
  { name: 'Safari', version: '18' },
  { name: 'Firefox', version: '133' },
  { name: 'Edge', version: '131' },
]
const ENVIRONMENTS = ['production', 'production', 'staging']

export function makeEvent(project: string, e: SampleError, i: number, at: number, now: number) {
  const python = project === 'payments-api'
  // A handful of people hit the same error again and again.
  const user = 100 + ((i * 37 + e.type.length * 11) % (8 + e.fn.length))
  const release = RELEASES.findLast((item) => at >= now - item.daysAgo * DAY) ?? RELEASES[0]
  const browser = BROWSERS[(i + e.fn.length) % BROWSERS.length]!
  return {
    event_id: crypto.randomUUID().replaceAll('-', ''),
    timestamp: new Date(at).toISOString(),
    platform: python ? 'python' : 'javascript',
    level: e.level ?? 'error',
    environment: ENVIRONMENTS[i % ENVIRONMENTS.length],
    release: release.version,
    server_name: python ? `api-${(i % 3) + 1}` : undefined,
    user: { id: String(user), email: `user${user}@example.com`, ip_address: `10.0.${i % 8}.${user % 250}` },
    tags: python ? { region: i % 3 ? 'af-west' : 'eu-west' } : { url: `https://app.example.com/quotes/${i % 3 ? 'new' : 'review'}` },
    contexts: python ? { runtime: { name: 'CPython', version: '3.13.1' } } : { browser, os: { name: i % 3 ? 'Windows' : 'macOS' } },
    breadcrumbs: {
      values: [
        { timestamp: at / 1000 - 5, category: python ? 'query' : 'navigation', message: python ? 'SELECT * FROM policies WHERE id = %s' : '/quotes → /quotes/new' },
        { timestamp: at / 1000 - 2, category: 'http', data: { url: '/api/quote', method: 'POST', status_code: 200 } },
      ],
    },
    exception: {
      values: [
        {
          type: e.type,
          value: e.value,
          mechanism: python ? { type: 'django', handled: false } : { type: 'onerror', handled: false, data: { function: 'window.onerror' } },
          stacktrace: {
            frames: [
              { filename: python ? 'django/core/handlers/base.py' : 'node_modules/react-dom/client.js', function: python ? 'get_response' : 'commitRoot', lineno: 197, in_app: false },
              { filename: python ? 'main.py' : 'src/main.tsx', function: 'main', lineno: 12, in_app: true },
              {
                filename: e.file,
                function: e.fn,
                lineno: 130,
                in_app: true,
                pre_context: python ? ['', `def ${e.fn}(payload):`, '    validate(payload)'] : ['', `export function ${e.fn}(props) {`, '  const quote = useQuote(props.id)'],
                context_line: python ? '    result = gateway.submit(payload)' : '  return quote.premium.amount.toFixed(2)',
                post_context: python ? ['    return result', ''] : ['}', ''],
              },
            ],
          },
        },
      ],
    },
    request: {
      url: `https://app.example.com/${project}/${e.fn}`,
      method: python ? 'POST' : 'GET',
      headers: { 'User-Agent': python ? 'python-requests/2.32' : `${browser.name}/${browser.version}`, Accept: 'application/json' },
      query_string: `quote=${100 + i}&plan=${i % 2 ? 'gold' : 'basic'}`,
      cookies: { session: `s-${user}`, theme: i % 2 ? 'dark' : 'light' },
    },
    // What the SDK attached by hand, which GlitchTip keeps as the event's additional data.
    extra: { quoteId: 5000 + i, plan: { tier: i % 2 ? 'gold' : 'basic', seats: 1 + (i % 4) } },
  }
}
