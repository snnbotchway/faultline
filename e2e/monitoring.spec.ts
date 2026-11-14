import { expect, test, type Page } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

const uptime = `/${DEMO.org}/uptime-monitors`
const row = (page: Page, text: string) => page.getByRole('listitem').filter({ hasText: text })
const unique = () => Math.random().toString(36).slice(2, 8)

test('the uptime list puts a monitor that is down first, and its page says since when and why', async ({ page }) => {
  await page.goto(uptime)
  await expect(page.getByRole('region', { name: 'Down', exact: true })).toContainText('Checkout API')
  await expect(page.getByRole('region', { name: 'Waiting for a first check' })).toContainText('Daily report')
  await row(page, 'Checkout API').getByRole('link').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Checkout API is down')
  await expect(page.getByRole('region', { name: 'Downtime' }).getByRole('button', { name: /so far/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Alerts', exact: true })).toContainText('Downtime and spikes')
})

test('a monitor page says how much of the day it was up and pages through every check', async ({ page }) => {
  await page.goto(uptime)
  await row(page, 'Checkout API').getByRole('link').click()
  await expect(page.getByRole('region', { name: 'Downtime' })).toContainText(/\d+(\.\d)?% up in the last 24 hours/)

  const checks = page.getByRole('region', { name: 'Checks', exact: true })
  const times = checks.locator('tbody time')
  await expect(checks).toContainText('1–25 of')
  const newest = await times.first().getAttribute('datetime')
  await checks.getByRole('button', { name: 'Older checks' }).click()
  await expect(checks).toContainText('26–50 of')
  await expect(times.first()).not.toHaveAttribute('datetime', newest!)
  await checks.getByRole('button', { name: 'Newer checks' }).click()
  await expect(checks).toContainText('1–25 of')

  await checks.getByRole('radio', { name: 'Incidents only' }).click()
  await expect(checks.getByRole('row').filter({ hasText: 'Wrong status' }).first()).toBeVisible()
  await expect(checks.getByRole('row').filter({ hasText: 'Up' }).first()).toBeVisible()
  await expect(checks.getByRole('button', { name: 'Older checks' })).toHaveCount(0)
  // The check where the current outage began is among every check too.
  const outage = await times.first().getAttribute('datetime')
  await checks.getByRole('radio', { name: 'All' }).click()
  const began = checks.locator(`tbody time[datetime="${outage}"]`)
  await expect(checks).toContainText('1–25 of')
  // A backend seeded a while ago has had more checks since, so the outage may be pages back.
  for (let pages = 0; pages < 20 && !(await began.isVisible()); pages++) {
    const top = await times.first().getAttribute('datetime')
    await checks.getByRole('button', { name: 'Older checks' }).click()
    await expect(times.first()).not.toHaveAttribute('datetime', top!)
  }
  await expect(began).toBeVisible()
})

test('a monitor is created, edited and deleted', async ({ page }) => {
  const name = `Health ${unique()}`
  await page.goto(uptime)
  await page.getByRole('link', { name: 'New monitor' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('URL').fill('https://example.com/health')
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByLabel('Timeout (seconds)').fill('10')
  await dialog.getByRole('button', { name: 'Create monitor' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name)

  await page.getByRole('link', { name: 'Edit' }).click()
  await page.getByRole('dialog').getByLabel('Name').fill(`${name} edited`)
  await page.getByRole('dialog').getByRole('button', { name: 'Save monitor' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`${name} edited`)

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete monitor' }).click()
  await expect(page).toHaveURL(new RegExp(`${uptime}$`))
  await expect(row(page, name)).toHaveCount(0)
})

test('a new heartbeat shows the address to call', async ({ page }) => {
  const name = `Backup ${unique()}`
  await page.goto(`${uptime}/new`)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: 'Heartbeat' }).click()
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByRole('button', { name: 'Create monitor' }).click()
  await expect(dialog.getByLabel('Heartbeat address')).toContainText('/heartbeat_check/')
  await dialog.getByRole('button', { name: 'Open monitor' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name)
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete monitor' }).click()
  await expect(page).toHaveURL(new RegExp(`${uptime}$`))
})

test('the status pages list the monitors on each page', async ({ page }) => {
  await page.goto(`${uptime}/status-pages`)
  await expect(row(page, 'Demo Co status').first()).toContainText('Checkout API')
})

test('an alert rule is created and deleted', async ({ page }) => {
  const name = `Outage ${unique()}`
  await page.goto(`/${DEMO.org}/alerts`)
  await expect(page.getByRole('region', { name: 'web-app' })).toContainText('Error burst')
  await page.getByRole('button', { name: 'New rule' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByLabel('Project').selectOption('mobile')
  await dialog.getByRole('checkbox', { name: 'An issue gets many events' }).click()
  await dialog.getByText('a monitor goes down').click()
  await dialog.getByRole('button', { name: 'Create rule' }).click()
  const rule = page.getByRole('region', { name: 'mobile' }).getByRole('button', { name })
  await expect(rule).toContainText('a monitor goes down')

  await rule.click()
  await expect(page.getByRole('dialog').getByLabel('Project')).toBeDisabled()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Delete rule' }).click()
  await expect(rule).toHaveCount(0)
})

test("a project's Alerts tab lists its rules and opens one from the stock address", async ({ page }) => {
  await page.goto(`/${DEMO.org}/settings/projects/web-app?tab=alerts`)
  await expect(page.getByRole('navigation', { name: 'Project settings' }).getByRole('link', { name: /Alerts/ })).toHaveAttribute('aria-current', 'page')
  const rule = page.getByRole('region', { name: 'Alert rules' }).getByRole('button', { name: /Error burst/ })
  await rule.click()
  await expect(page).toHaveURL(/\?tab=alerts&alert=\d+$/)
  await expect(page.getByRole('dialog').getByLabel('Name')).toHaveValue('Error burst')
})

test('a release lists the issues it brought apart from older ones', async ({ page }) => {
  await page.goto(`/${DEMO.org}/releases`)
  await row(page, '1.5.0').getByRole('link').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('1.5.0')
  await expect(page.getByRole('region', { name: 'First seen in this release' })).toContainText('Unexpected token < in JSON at position 0')
  await expect(page.getByRole('region', { name: 'Seen before, still happening' })).toContainText('Mobile money gateway did not respond')
  await expect(page.getByRole('region', { name: 'Deploys' })).toContainText('production')
})
