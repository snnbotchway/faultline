// Sample transactions and logs for the performance and logs screens: a week of requests with a few slow
// endpoints, two N+1 query patterns and a regression after 1.5.0, plus a day of application logs.
// Run after the seed. Spans are read from cold storage, so the backend needs GLITCHTIP_ENABLE_DUCKDB
// (dev/compose.yml sets it). Two steps run inside the local compose backend: creating yesterday's log
// partition, and moving the spans to cold storage. --no-backend-steps skips both.
// Hours older than 80 minutes are sealed once written, so a second run adds requests but no older spans.
// Does nothing when the backend already has transactions, unless --force.
// Usage: bun dev/sample-performance.ts [backendUrl] [--no-backend-steps] [--force]
import { join } from 'node:path'
import { DEMO, Session, seed, signIn } from './seed.ts'

const HOUR = 3_600_000
const DAY = 24 * HOUR

// Deterministic, so two fresh backends show the same picture.
let state = 20_261_114
function random() {
  state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
  return state / 4_294_967_296
}
const between = (low: number, high: number) => low + random() * (high - low)
const hex = (length: number) => Array.from({ length }, () => Math.floor(random() * 16).toString(16)).join('')

type SpanShape = { op: string; description: string; ms: [number, number]; times?: [number, number]; parallel?: boolean }
type TransactionShape = {
  name: string
  op: string
  method?: string
  perDay: number
  errorRate?: number
  // Time the handler itself takes, outside any span.
  own: [number, number]
  spans: SpanShape[]
  // Multiplies span durations from this many days ago onwards: a regression shipped with a release.
  slowerSince?: { daysAgo: number; factor: number; op: string }
}

const sql = (text: string) => ({ op: 'db', description: text })

export const TRANSACTIONS: Record<string, TransactionShape[]> = {
  'payments-api': [
    {
      name: '/api/policies/',
      op: 'http.server',
      method: 'GET',
      perDay: 46,
      own: [18, 40],
      spans: [
        { op: 'middleware.django', description: 'django.contrib.auth.middleware.AuthenticationMiddleware', ms: [1, 3] },
        { ...sql('SELECT "policies"."id", "policies"."number", "policies"."customer_id" FROM "policies" WHERE "policies"."agent_id" = 7 ORDER BY "policies"."created" DESC LIMIT 50'), ms: [9, 22] },
        { ...sql('SELECT "customers"."id", "customers"."name", "customers"."phone" FROM "customers" WHERE "customers"."id" = 4411 LIMIT 21'), ms: [3, 9], times: [38, 50] },
        { ...sql('SELECT "premiums"."id", "premiums"."amount", "premiums"."due" FROM "premiums" WHERE "premiums"."policy_id" = 912'), ms: [4, 12], times: [38, 50] },
        { op: 'serialize', description: 'PolicyListSerializer', ms: [20, 45] },
      ],
    },
    {
      name: '/api/payments/momo/charge',
      op: 'http.server',
      method: 'POST',
      perDay: 38,
      errorRate: 0.12,
      own: [10, 25],
      spans: [
        { ...sql('SELECT "policies"."id", "policies"."number" FROM "policies" WHERE "policies"."number" = \'EL-204411\' LIMIT 21'), ms: [3, 8] },
        { op: 'cache.get', description: 'momo:token', ms: [1, 2] },
        { op: 'http.client', description: 'POST https://gateway.momo.example/v2/collections/charge', ms: [900, 4200] },
        { ...sql('INSERT INTO "payments" ("ref", "policy_id", "amount", "status") VALUES (\'MM-88213\', 912, 240.00, \'pending\') RETURNING "payments"."id"'), ms: [4, 10] },
        { op: 'queue.submit.celery', description: 'payments.tasks.send_receipt', ms: [2, 5] },
      ],
    },
    {
      name: '/api/quotes/',
      op: 'http.server',
      method: 'POST',
      perDay: 64,
      own: [12, 24],
      slowerSince: { daysAgo: 2, factor: 3.4, op: 'db' },
      spans: [
        { op: 'cache.get', description: 'rates:motor:2026', ms: [1, 3] },
        { ...sql('SELECT "rates"."band", "rates"."factor" FROM "rates" WHERE "rates"."product" = \'motor\' AND "rates"."year" = 2026'), ms: [28, 60] },
        { ...sql('SELECT COUNT(*) AS "__count" FROM "claims" WHERE "claims"."customer_id" = 4411'), ms: [22, 48] },
        { op: 'function', description: 'quotes.pricing.price_motor', ms: [30, 70] },
        { ...sql('INSERT INTO "quotes" ("customer_id", "product", "premium") VALUES (4411, \'motor\', 1840.50) RETURNING "quotes"."id"'), ms: [4, 9] },
      ],
    },
    {
      name: '/api/claims/',
      op: 'http.server',
      method: 'GET',
      perDay: 30,
      own: [10, 22],
      spans: [
        { ...sql('SELECT "claims"."id", "claims"."policy_id", "claims"."status" FROM "claims" WHERE "claims"."status" = \'open\' ORDER BY "claims"."filed" DESC LIMIT 20'), ms: [12, 30] },
        { ...sql('SELECT "documents"."id", "documents"."kind" FROM "documents" WHERE "documents"."claim_id" = 318'), ms: [5, 14], times: [9, 14] },
        { op: 'serialize', description: 'ClaimListSerializer', ms: [8, 20] },
      ],
    },
    {
      name: '/api/policies/{id}/',
      op: 'http.server',
      method: 'GET',
      perDay: 120,
      own: [6, 14],
      spans: [
        { ...sql('SELECT "policies"."id", "policies"."number", "policies"."customer_id" FROM "policies" WHERE "policies"."id" = 912 LIMIT 21'), ms: [3, 9] },
        { op: 'serialize', description: 'PolicySerializer', ms: [2, 6] },
      ],
    },
    {
      name: '/api/webhooks/momo',
      op: 'http.server',
      method: 'POST',
      perDay: 36,
      errorRate: 0.03,
      own: [5, 12],
      spans: [
        { op: 'function', description: 'payments.webhooks.verify_signature', ms: [1, 3] },
        { ...sql('UPDATE "payments" SET "status" = \'paid\' WHERE "payments"."ref" = \'MM-88213\''), ms: [5, 14] },
        { op: 'queue.submit.celery', description: 'payments.tasks.send_receipt', ms: [2, 5] },
      ],
    },
    { name: '/api/health/', op: 'http.server', method: 'GET', perDay: 180, own: [1, 3], spans: [{ ...sql('SELECT 1'), ms: [1, 2] }] },
    {
      name: 'payments.tasks.reconcile_statements',
      op: 'queue.task.celery',
      perDay: 4,
      errorRate: 0.1,
      own: [300, 700],
      spans: [
        { op: 'http.client', description: 'GET https://gateway.momo.example/v2/statements/20261114', ms: [2400, 5200] },
        { ...sql('SELECT "payments"."id", "payments"."ref", "payments"."status" FROM "payments" WHERE "payments"."created" >= \'2026-11-13\''), ms: [600, 1500] },
        { ...sql('UPDATE "payments" SET "reconciled" = true WHERE "payments"."id" IN (1, 2, 3, 4)'), ms: [20, 60], times: [40, 60] },
        { op: 'file.write', description: 'statements/2026-11-13.csv', ms: [200, 500] },
      ],
    },
    {
      name: 'payments.tasks.send_receipt',
      op: 'queue.task.celery',
      perDay: 34,
      own: [8, 20],
      spans: [
        { op: 'template.render', description: 'receipts/momo.html', ms: [10, 26] },
        { op: 'http.client', description: 'POST https://sms.example/v1/messages', ms: [180, 520] },
      ],
    },
  ],
  'web-app': [
    {
      name: '/dashboard',
      op: 'pageload',
      perDay: 40,
      own: [60, 140],
      spans: [
        { op: 'browser', description: 'domContentLoadedEvent', ms: [120, 260] },
        { op: 'resource.script', description: '/assets/index-4f2a91.js', ms: [260, 620], parallel: true },
        { op: 'resource.css', description: '/assets/index-9d1c07.css', ms: [40, 120], parallel: true },
        { op: 'http.client', description: 'GET /api/policies/', ms: [820, 1900] },
        { op: 'http.client', description: 'GET /api/claims/', ms: [180, 420], parallel: true },
        { op: 'ui.react.render', description: '<Dashboard>', ms: [40, 110] },
      ],
    },
    {
      name: '/quotes/new',
      op: 'pageload',
      perDay: 34,
      own: [50, 120],
      spans: [
        { op: 'browser', description: 'domContentLoadedEvent', ms: [110, 240] },
        { op: 'resource.script', description: '/assets/quote-form-71be02.js', ms: [300, 700], parallel: true },
        { op: 'http.client', description: 'GET /api/rates/?product=motor', ms: [90, 240] },
        { op: 'ui.react.render', description: '<QuoteForm>', ms: [30, 80] },
      ],
    },
    {
      name: '/policies/:id',
      op: 'navigation',
      perDay: 58,
      own: [20, 50],
      spans: [
        { op: 'http.client', description: 'GET /api/policies/912/', ms: [40, 130] },
        { op: 'ui.react.render', description: '<PolicyPage>', ms: [20, 60] },
      ],
    },
    {
      name: '/claims',
      op: 'navigation',
      perDay: 26,
      own: [20, 50],
      spans: [
        { op: 'http.client', description: 'GET /api/claims/', ms: [200, 460] },
        { op: 'ui.react.render', description: '<ClaimsTable>', ms: [60, 180] },
      ],
    },
  ],
  mobile: [
    {
      name: 'ClaimsScreen',
      op: 'ui.load',
      perDay: 22,
      errorRate: 0.08,
      own: [80, 200],
      spans: [
        { op: 'http.client', description: 'GET https://api.example.com/api/claims/', ms: [320, 900] },
        { op: 'db.sqlite', description: 'SELECT * FROM claims_cache WHERE synced = 0', ms: [10, 40] },
        { op: 'ui.render', description: 'ClaimsList', ms: [60, 160] },
      ],
    },
    {
      name: 'app.start.cold',
      op: 'app.start',
      perDay: 18,
      own: [200, 420],
      spans: [
        { op: 'app.start.native', description: 'Native module initialisation', ms: [380, 760] },
        { op: 'app.start.js', description: 'JS bundle execution', ms: [420, 900] },
        { op: 'http.client', description: 'GET https://api.example.com/api/session/', ms: [120, 380] },
      ],
    },
  ],
}

const ENVIRONMENTS = ['production', 'production', 'production', 'staging']
const releaseAt = (at: number, now: number) => (at >= now - 2 * DAY ? '1.5.0' : at >= now - 6 * DAY ? '1.4.1' : '1.4.0')

function makeTransaction(shape: TransactionShape, at: number, now: number) {
  const traceId = hex(32)
  const rootSpan = hex(16)
  const slower = shape.slowerSince && at >= now - shape.slowerSince.daysAgo * DAY ? shape.slowerSince : undefined
  const spans: object[] = []
  let cursor = at + between(...shape.own) / 3
  let end = cursor
  for (const span of shape.spans) {
    const times = span.times ? Math.round(between(...span.times)) : 1
    for (let i = 0; i < times; i++) {
      const duration = between(...span.ms) * (slower && span.op === slower.op ? slower.factor : 1)
      spans.push({
        span_id: hex(16),
        parent_span_id: rootSpan,
        trace_id: traceId,
        op: span.op,
        description: span.description,
        start_timestamp: cursor / 1000,
        timestamp: (cursor + duration) / 1000,
      })
      end = Math.max(end, cursor + duration)
      if (!span.parallel) cursor += duration + 0.4
    }
  }
  const finished = Math.max(end, cursor) + between(...shape.own) / 2
  const failed = random() < (shape.errorRate ?? 0)
  return {
    traceId,
    finished,
    failed,
    event: {
      type: 'transaction',
      event_id: hex(32),
      transaction: shape.name,
      start_timestamp: at / 1000,
      timestamp: finished / 1000,
      environment: ENVIRONMENTS[Math.floor(random() * ENVIRONMENTS.length)],
      release: releaseAt(at, now),
      contexts: { trace: { trace_id: traceId, span_id: rootSpan, op: shape.op, status: failed ? 'internal_error' : 'ok' } },
      request: shape.method ? { method: shape.method, url: `https://api.example.com${shape.name}` } : undefined,
      spans,
    },
  }
}

// Start times for one shape across the last week: working hours on past days, up to now today.
function startTimes(shape: TransactionShape, now: number) {
  const today = Math.floor(now / DAY) * DAY
  const times: number[] = []
  for (let day = 6; day >= 0; day--) {
    const start = today - day * DAY
    const [from, length] = day === 0 ? [start, now - start - 5 * 60_000] : [start + 6 * HOUR, 14 * HOUR]
    const weekend = [0, 6].includes(new Date(start).getUTCDay())
    const count = Math.round(shape.perDay * (weekend ? 0.35 : 1) * between(0.8, 1.2) * (day === 0 ? length / (14 * HOUR) : 1))
    for (let i = 0; i < count; i++) times.push(from + random() * length)
  }
  return times.filter((time) => time > 0 && time < now).sort((a, b) => a - b)
}

type LogShape = { level: string; body: (i: number) => string; attributes?: (i: number) => Record<string, string | number | boolean>; weight: number }

const SERVICES: Record<string, { service: string; hosts: string[]; logs: LogShape[] }> = {
  'payments-api': {
    service: 'payments-api',
    hosts: ['api-1', 'api-2', 'api-3'],
    logs: [
      { level: 'info', weight: 30, body: (i) => `POST /api/payments/momo/charge 201 ${1200 + ((i * 37) % 2400)}ms`, attributes: (i) => ({ 'http.request.method': 'POST', 'http.route': '/api/payments/momo/charge', 'http.response.status_code': 201, 'payment.ref': `MM-${88000 + i}`, 'payment.amount': 120 + ((i * 13) % 900) }) },
      { level: 'info', weight: 26, body: (i) => `Receipt sent for payment MM-${88000 + i}`, attributes: (i) => ({ 'payment.ref': `MM-${88000 + i}`, channel: 'sms', 'code.function': 'send_receipt' }) },
      { level: 'debug', weight: 22, body: (i) => `Rate table cache hit for motor:${2020 + (i % 7)}`, attributes: () => ({ 'cache.key': 'rates:motor', 'cache.hit': true }) },
      { level: 'warn', weight: 9, body: (i) => `Mobile money gateway slow: ${3100 + ((i * 91) % 1800)}ms for collections/charge`, attributes: (i) => ({ 'gateway.host': 'gateway.momo.example', 'gateway.attempt': 1 + (i % 3), 'payment.ref': `MM-${88000 + i}` }) },
      { level: 'error', weight: 5, body: () => 'Mobile money gateway did not respond within 30s', attributes: (i) => ({ 'exception.type': 'TimeoutError', 'gateway.host': 'gateway.momo.example', 'payment.ref': `MM-${88000 + i}`, 'code.function': 'charge_mobile_money', 'code.filepath': 'payments/momo.py' }) },
      { level: 'error', weight: 2, body: () => 'duplicate key value violates unique constraint "payment_ref_key"', attributes: (i) => ({ 'exception.type': 'IntegrityError', 'payment.ref': `MM-${88000 + i}`, 'code.function': 'record_payment' }) },
      { level: 'fatal', weight: 0.4, body: () => 'Worker exited: could not connect to database after 5 attempts', attributes: () => ({ 'db.system': 'postgresql', 'process.exit_code': 1 }) },
      { level: 'trace', weight: 6, body: (i) => `Webhook signature verified in ${1 + (i % 3)}ms`, attributes: () => ({ 'code.function': 'verify_signature' }) },
    ],
  },
  'web-app': {
    service: 'web-app',
    hosts: ['edge-accra', 'edge-london'],
    logs: [
      { level: 'info', weight: 30, body: (i) => `Quote ${40000 + i} created for motor cover`, attributes: (i) => ({ 'quote.id': 40000 + i, product: 'motor', 'user.id': String(100 + (i % 40)) }) },
      { level: 'info', weight: 18, body: () => 'Route changed /quotes → /quotes/new', attributes: () => ({ 'browser.name': 'Chrome', 'url.path': '/quotes/new' }) },
      { level: 'warn', weight: 8, body: () => 'Quote form submitted twice within 300ms', attributes: (i) => ({ 'user.id': String(100 + (i % 40)), 'url.path': '/quotes/new' }) },
      { level: 'error', weight: 3, body: () => "Cannot read properties of undefined (reading 'premium')", attributes: () => ({ 'exception.type': 'TypeError', 'code.function': 'renderQuote', 'code.filepath': 'src/quotes/QuoteCard.tsx' }) },
      { level: 'debug', weight: 10, body: (i) => `Rates fetched in ${90 + ((i * 17) % 150)}ms`, attributes: () => ({ 'http.route': '/api/rates/' }) },
    ],
  },
  mobile: {
    service: 'mobile',
    hosts: [],
    logs: [
      { level: 'info', weight: 14, body: (i) => `Synced ${1 + (i % 6)} claims`, attributes: (i) => ({ 'device.model': i % 2 ? 'SM-G998B' : 'iPhone15,2', 'os.name': i % 2 ? 'Android' : 'iOS', 'app.version': '1.5.0' }) },
      { level: 'warn', weight: 5, body: () => 'Claims sync retried after status 503', attributes: (i) => ({ 'retry.count': 1 + (i % 3), 'os.name': i % 2 ? 'Android' : 'iOS' }) },
      { level: 'error', weight: 2, body: () => 'Request failed with status code 503', attributes: () => ({ 'exception.type': 'NetworkError', 'code.function': 'syncClaims' }) },
    ],
  },
}

const SEVERITY: Record<string, number> = { trace: 1, debug: 5, info: 9, warn: 13, error: 17, fatal: 21 }
const typed = (value: string | number | boolean) => ({ value, type: typeof value === 'string' ? 'string' : typeof value === 'boolean' ? 'boolean' : Number.isInteger(value) ? 'integer' : 'double' })

async function send(base: string, project: { id: number; key: string }, items: [object, object][]) {
  const lines = [JSON.stringify({ sent_at: new Date().toISOString() }), ...items.flatMap(([header, payload]) => [JSON.stringify(header), JSON.stringify(payload)])]
  const res = await fetch(`${base}/api/${project.id}/envelope/`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-sentry-envelope', 'x-sentry-auth': `Sentry sentry_version=7, sentry_key=${project.key}, sentry_client=faultline-seed/1.0` },
    body: lines.join('\n'),
  })
  if (!res.ok) throw new Error(`envelope → ${res.status} ${await res.text()}`)
}

// The same records an OpenTelemetry exporter would post.
async function sendOtlp(base: string, key: string, service: string, records: { at: number; level: string; body: string; attributes: Record<string, string | number | boolean> }[]) {
  const attribute = ([name, value]: [string, string | number | boolean]) => ({
    key: name,
    value: typeof value === 'string' ? { stringValue: value } : typeof value === 'boolean' ? { boolValue: value } : Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value },
  })
  const res = await fetch(`${base}/v1/logs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sentry-auth': `Sentry sentry_key=${key}` },
    body: JSON.stringify({
      resourceLogs: [
        {
          resource: { attributes: [attribute(['service.name', service]), attribute(['deployment.environment.name', 'production']), attribute(['host.name', 'worker-1'])] },
          scopeLogs: [
            {
              scope: { name: 'payments.tasks' },
              logRecords: records.map((record) => ({
                timeUnixNano: String(BigInt(Math.round(record.at)) * 1_000_000n),
                severityNumber: SEVERITY[record.level],
                severityText: record.level.toUpperCase(),
                body: { stringValue: record.body },
                attributes: Object.entries(record.attributes).map(attribute),
              })),
            },
          ],
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`/v1/logs → ${res.status} ${await res.text()}`)
}

async function manage(lines: string[], failure: string) {
  const run = Bun.spawn(['docker', 'compose', '-f', 'dev/compose.yml', 'exec', '-T', 'web', './manage.py', 'shell', '-c', lines.join('\n')], {
    cwd: join(import.meta.dir, '..'),
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if ((await run.exited) !== 0) throw new Error(`${failure} Pass --no-backend-steps for a backend that is not the local compose.`)
}

// A fresh backend has log partitions from today on, and one log outside them fails its whole batch.
const ensureLogPartitions = () =>
  manage(
    [
      'from datetime import timedelta',
      'from django.utils import timezone',
      'from glitchtip.base_commands import MakeSampleCommand',
      'now = timezone.now()',
      'MakeSampleCommand()._ensure_partitions(now - timedelta(days=2), now, daily_tables=["logs_logevent"])',
    ],
    'Creating the log partitions failed.',
  )

// Moves the spans from staging into cold storage and seals the finished hours, as the backend's own
// scheduled tasks do. The backend leaves spans in staging for five minutes; the clock is moved past that.
const promote = () =>
  manage(
    [
      'import asyncio',
      'from datetime import timedelta',
      'from unittest import mock',
      'from django.utils import timezone',
      'from apps.performance import promotion',
      'later = timezone.now() + timedelta(minutes=6)',
      'async def drain():',
      '    while True:',
      '        promoted, truncated = await promotion.promote_spans()',
      '        print("spans moved:", promoted)',
      '        if not (truncated and promoted): break',
      'with mock.patch.object(promotion.timezone, "now", return_value=later):',
      '    asyncio.run(drain())',
      'print("hours sealed:", promotion.compact_span_chunks())',
    ],
    'Moving the spans to cold storage failed.',
  )

export async function samplePerformance(base: string, backendSteps = true, force = false) {
  const keys = await seed(base)
  const session = new Session(base)
  await signIn(session)
  const existing: unknown[] = await session.ok('GET', `/api/0/organizations/${DEMO.org}/transaction-groups/?limit=1`)
  if (existing.length > 0 && !force) return { transactions: 0, logs: 0 }
  if (backendSteps) await ensureLogPartitions()
  const now = Date.now()
  const traces: Record<string, { traceId: string; at: number; failed: boolean; name: string }[]> = {}
  let transactions = 0

  for (const [slug, shapes] of Object.entries(TRANSACTIONS)) {
    const made = shapes.flatMap((shape) =>
      startTimes(shape, now).map((at) => {
        const transaction = makeTransaction(shape, at, now)
        return { at, shape, ...transaction }
      }),
    )
    traces[slug] = made.filter((item) => item.at > now - 22 * HOUR).map((item) => ({ traceId: item.traceId, at: item.finished, failed: item.failed, name: item.shape.name }))
    for (let i = 0; i < made.length; i += 20) {
      await send(base, keys[slug]!, made.slice(i, i + 20).map((item) => [{ type: 'transaction' }, item.event]))
    }
    transactions += made.length
  }

  // Logs older than a day are rejected, so they cover the last 22 hours, with a burst of gateway errors
  // in the last two.
  let logs = 0
  for (const [slug, source] of Object.entries(SERVICES)) {
    const total = source.logs.reduce((sum, shape) => sum + shape.weight, 0)
    const items: object[] = []
    const count = slug === 'payments-api' ? 620 : slug === 'web-app' ? 360 : 140
    for (let i = 0; i < count; i++) {
      const recent = slug === 'payments-api' && i % 5 === 0
      const at = now - (recent ? random() * 2 * HOUR : random() ** 1.4 * 22 * HOUR)
      let pick = random() * total
      let shape = source.logs.find((candidate) => (pick -= candidate.weight) < 0) ?? source.logs[0]!
      if (recent && i % 10 === 0) shape = source.logs.find((candidate) => candidate.level === 'error')!
      // Tie most logs to a request that ran around the same time, so a log leads to its trace.
      const near = traces[slug]!.findLast((trace) => trace.at <= at && (shape.level !== 'error' || trace.failed)) ?? traces[slug]!.find((trace) => trace.at <= at + HOUR)
      const attributes: Record<string, string | number | boolean> = {
        'sentry.service': source.service,
        'sentry.environment': ENVIRONMENTS[i % ENVIRONMENTS.length]!,
        'sentry.release': '1.5.0',
        ...(source.hosts.length ? { 'host.name': source.hosts[i % source.hosts.length]! } : {}),
        ...(near && shape.level !== 'debug' ? { 'sentry.transaction': near.name } : {}),
        ...shape.attributes?.(i),
      }
      items.push({
        timestamp: at / 1000,
        level: shape.level,
        severity_number: SEVERITY[shape.level],
        body: shape.body(i),
        trace_id: near && i % 7 !== 0 ? near.traceId : undefined,
        span_id: near && i % 7 !== 0 ? hex(16) : undefined,
        attributes: Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, typed(value)])),
      })
    }
    for (let i = 0; i < items.length; i += 100) {
      const batch = items.slice(i, i + 100)
      await send(base, keys[slug]!, [[{ type: 'log', item_count: batch.length, content_type: 'application/vnd.sentry.items.log+json' }, { items: batch }]])
    }
    logs += items.length
  }

  const worker = Array.from({ length: 48 }, (_, i) => ({
    at: now - (i + random()) * 25 * 60_000,
    level: i % 16 === 3 ? 'error' : i % 6 === 1 ? 'warn' : 'info',
    body: i % 16 === 3 ? 'Statement reconciliation failed: gateway returned 502' : i % 6 === 1 ? `Reconciliation found ${1 + (i % 4)} unmatched payments` : `Reconciled ${180 + ((i * 29) % 90)} payments in ${(8 + (i % 7)).toFixed(1)}s`,
    attributes: { 'code.function': 'reconcile_statements', 'messaging.system': 'celery', 'statement.rows': 180 + ((i * 29) % 90) },
  }))
  await sendOtlp(base, keys['payments-api']!.key, 'payments-worker', worker)
  logs += worker.length

  // Ingest is asynchronous: give the worker a moment before moving spans.
  await new Promise((resolve) => setTimeout(resolve, 8000))
  if (backendSteps) await promote()
  return { transactions, logs }
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const base = args.find((arg) => !arg.startsWith('--')) ?? process.env.BACKEND_URL ?? 'http://localhost:8600'
  console.log(JSON.stringify({ base, ...(await samplePerformance(base, !args.includes('--no-backend-steps'), args.includes('--force'))) }))
}
