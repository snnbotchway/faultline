import { expect, test, type Page } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

const inbox = `/${DEMO.org}/issues`
const unique = () => Math.random().toString(36).slice(2, 8)

async function openIssue(page: Page, text: string) {
  await page.goto(inbox)
  await page.getByRole('listitem').filter({ hasText: text }).getByRole('link').click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

async function projectKey(page: Page) {
  const [key] = (await (await page.request.get(`/api/0/projects/${DEMO.org}/web-app/keys/`)).json()) as { public: string; projectID: number }[]
  return { key: key!.public.replaceAll('-', ''), project: key!.projectID }
}

// Waits until the backend has filed what was sent as an issue matching `query`.
async function issueFor(page: Page, query: string) {
  let id = ''
  await expect
    .poll(async () => {
      const issues = (await (await page.request.get(`/api/0/organizations/${DEMO.org}/issues/?query=${encodeURIComponent(query)}`)).json()) as { id: string }[]
      id = issues[0]?.id ?? ''
      return id
    })
    .not.toBe('')
  return id
}

const section = (page: Page, title: string) => page.locator('section', { has: page.getByRole('heading', { name: title }) })

test('an event reads as plain text, oldest call first, with how it was caught and what the SDK attached', async ({ page }) => {
  await openIssue(page, 'WEB-APP-1')
  await expect(page.getByText('onerror · unhandled · window.onerror')).toBeVisible()

  await page.getByRole('radio', { name: 'Raw' }).click()
  const raw = page.locator('pre').filter({ hasText: 'TypeError: Cannot read properties' })
  await expect(raw).toContainText('at renderQuote (src/quotes/QuoteCard.tsx:130)')
  await page.getByRole('radio', { name: 'Oldest first' }).click()
  await expect(raw).toContainText(/commitRoot[\s\S]*renderQuote/)

  await page.getByRole('button', { name: /^Cookies/ }).click()
  await expect(page.getByText('theme', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Additional data' })).toBeVisible()
  await expect(page.getByText('quoteId')).toBeVisible()
})

test('a tag shows its commonest values and an "other" bar, and a web address opens on its own', async ({ page }) => {
  await openIssue(page, 'WEB-APP-1')
  const users = page.locator('div').filter({ has: page.getByRole('heading', { name: 'user.id' }) }).last()
  await expect(users.getByRole('link')).toHaveCount(4)
  await users.getByRole('button', { name: '6 more' }).click()
  await expect(users.getByRole('link')).toHaveCount(10)
  await expect(users.getByRole('listitem').last()).toContainText('other')
  await expect(page.getByRole('link', { name: /^Open https:\/\/app\.example\.com\/quotes\/.* in a new tab$/ }).first()).toHaveAttribute('target', '_blank')
})

test('an issue fits a phone screen without scrolling sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openIssue(page, 'WEB-APP-1')
  await expect(page.getByRole('heading', { name: 'Tags' })).toBeVisible()
  expect(await page.evaluate<boolean>('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true)
})

test('the way back to the list keeps the issue\'s project', async ({ page }) => {
  await openIssue(page, 'WEB-APP-1')
  await page.getByRole('link', { name: 'Issues', exact: true }).last().click()
  await expect(page).toHaveURL(/\/issues\?project=/)
  await expect(page.getByRole('button', { name: 'Projects' })).toContainText('web-app')
})

test('an event is copied for an AI assistant with where it came from', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openIssue(page, 'WEB-APP-1')
  await page.getByRole('button', { name: 'Copy for AI' }).click()
  await expect(page.getByRole('status')).toContainText('Copied')
  const copied = await page.evaluate<string>('navigator.clipboard.readText()')
  expect(copied).toContain('GlitchTip error event')
  expect(copied).toContain(`Organization: ${DEMO.org}`)
  expect(copied).toMatch(/Event URL: \S+\/issues\/\d+\/events\/\S+/)
  expect(copied).toContain('"exception"')
})

test('resolving in the next release says which release it was tied to', async ({ page }) => {
  await openIssue(page, 'Invalid time value')
  await page.getByRole('button', { name: 'More ways to resolve' }).click()
  await page.getByRole('menuitem', { name: 'Resolve in next release' }).click()
  await expect(page.getByRole('status')).toContainText('Resolved as of release 1.5.0.')
  await expect(page.getByText('Resolved in 1.5.0', { exact: true })).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('Unresolved', { exact: true })).toBeVisible()
})

test('a CSP violation shows its report', async ({ page }) => {
  const host = `cdn-${unique()}.example.net`
  const { key, project } = await projectKey(page)
  const sent = await page.request.post(`/api/${project}/security/?glitchtip_key=${key}`, {
    headers: { 'content-type': 'application/csp-report' },
    data: { 'csp-report': { 'document-uri': 'https://app.example.com/', 'violated-directive': 'script-src-elem', 'effective-directive': 'script-src-elem', 'original-policy': "default-src 'self'", disposition: 'enforce', 'blocked-uri': `https://${host}/x.js`, 'status-code': 200 } },
  })
  expect(sent.ok()).toBe(true)
  await page.goto(`/${DEMO.org}/issues/${await issueFor(page, host)}`)
  await expect(section(page, 'CSP report')).toContainText('script-src-elem')
  await expect(section(page, 'CSP report')).toContainText(`https://${host}/x.js`)
})

test('a user report links to the event it was sent for', async ({ page }) => {
  const type = `ReportedError${unique()}`
  const eventId = crypto.randomUUID().replaceAll('-', '')
  const { key, project } = await projectKey(page)
  const stored = await page.request.post(`/api/${project}/store/`, {
    headers: { 'x-sentry-auth': `Sentry sentry_version=7, sentry_key=${key}` },
    data: { event_id: eventId, timestamp: new Date().toISOString(), platform: 'javascript', exception: { values: [{ type, value: 'saved a quote twice' }] } },
  })
  expect(stored.ok()).toBe(true)
  const id = await issueFor(page, type)
  const dsn = `http://${key}@localhost/${project}`
  const report = await page.request.post(`/api/embed/error-page/?dsn=${encodeURIComponent(dsn)}&eventId=${eventId}`, {
    form: { name: 'Ama Mensah', email: 'ama@example.com', comments: 'It saved twice' },
  })
  expect(report.ok()).toBe(true)
  await page.goto(`/${DEMO.org}/issues/${id}`)
  await section(page, 'User reports').getByRole('link', { name: /Ama Mensah/ }).click()
  await expect(page).toHaveURL(new RegExp(`/issues/${id}/events/`))
  await expect(page.getByText('saved a quote twice').first()).toBeVisible()
})
