// Deterministic sample events, so screenshots and e2e runs see the same data.
type SampleError = { type: string; value: string; fn: string; file: string; count: number; level?: string }

export const ERRORS: Record<string, SampleError[]> = {
  'web-app': [
    { type: 'TypeError', value: "Cannot read properties of undefined (reading 'premium')", fn: 'renderQuote', file: 'src/quotes/QuoteCard.tsx', count: 24 },
    { type: 'ChunkLoadError', value: 'Loading chunk 412 failed.', fn: 'loadRoute', file: 'src/router.ts', count: 9 },
    { type: 'RangeError', value: 'Invalid time value', fn: 'formatDate', file: 'src/lib/dates.ts', count: 4 },
    { type: 'Warning', value: 'Quote form submitted twice within 300ms', fn: 'submitQuote', file: 'src/quotes/QuoteForm.tsx', count: 3, level: 'warning' },
  ],
  'payments-api': [
    { type: 'IntegrityError', value: 'duplicate key value violates unique constraint "payment_ref_key"', fn: 'record_payment', file: 'payments/services.py', count: 17 },
    { type: 'TimeoutError', value: 'Mobile money gateway did not respond within 30s', fn: 'charge_mobile_money', file: 'payments/momo.py', count: 31 },
    { type: 'KeyError', value: "'policy_number'", fn: 'handle_webhook', file: 'payments/webhooks.py', count: 6 },
    { type: 'ValueError', value: 'Premium amount must be positive, got -12.50', fn: 'validate_amount', file: 'payments/validators.py', count: 2 },
  ],
  mobile: [
    { type: 'NetworkError', value: 'Request failed with status code 503', fn: 'syncClaims', file: 'app/claims/sync.ts', count: 12 },
    { type: 'Error', value: 'Biometric prompt was cancelled', fn: 'unlockApp', file: 'app/auth/biometrics.ts', count: 5, level: 'info' },
  ],
}

const BROWSERS = ['Chrome 131', 'Safari 18', 'Firefox 133', 'Edge 131']
const RELEASES = ['1.4.0', '1.4.1', '1.5.0']
const ENVIRONMENTS = ['production', 'production', 'staging']

export function makeEvent(project: string, e: SampleError, i: number) {
  const python = project === 'payments-api'
  const minutesAgo = ((i * 977 + e.fn.length * 131) % (60 * 24 * 10)) + 1
  const user = (i * 37 + e.type.length) % 400
  return {
    event_id: crypto.randomUUID().replaceAll('-', ''),
    timestamp: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    platform: python ? 'python' : 'javascript',
    level: e.level ?? 'error',
    environment: ENVIRONMENTS[i % ENVIRONMENTS.length],
    release: RELEASES[i % RELEASES.length],
    server_name: python ? `api-${(i % 3) + 1}` : undefined,
    user: { id: String(user), email: `user${user}@example.com`, ip_address: `10.0.${i % 8}.${user % 250}` },
    tags: python ? { region: i % 2 ? 'eu-west' : 'af-west' } : { browser: BROWSERS[i % BROWSERS.length] },
    contexts: python
      ? { runtime: { name: 'CPython', version: '3.13.1' } }
      : { browser: { name: BROWSERS[i % BROWSERS.length] }, os: { name: i % 2 ? 'macOS' : 'Windows' } },
    breadcrumbs: {
      values: [
        { timestamp: Date.now() / 1000 - 5, category: python ? 'query' : 'navigation', message: python ? 'SELECT * FROM policies WHERE id = %s' : '/quotes → /quotes/new' },
        { timestamp: Date.now() / 1000 - 2, category: 'http', data: { url: '/api/quote', method: 'POST', status_code: 200 } },
      ],
    },
    exception: {
      values: [
        {
          type: e.type,
          value: e.value,
          stacktrace: {
            frames: [
              { filename: python ? 'django/core/handlers/base.py' : 'node_modules/react-dom/client.js', function: python ? 'get_response' : 'commitRoot', lineno: 197, in_app: false },
              { filename: python ? 'main.py' : 'src/main.tsx', function: 'main', lineno: 12, in_app: true },
              {
                filename: e.file,
                function: e.fn,
                lineno: [41, 88, 130][i % 3],
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
    request: { url: `https://app.example.com/${project}/${e.fn}`, method: python ? 'POST' : 'GET' },
  }
}
