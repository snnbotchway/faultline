import { expect, test } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

const performance = `/${DEMO.org}/performance`

test('transactions are ranked by time spent, with the failing ones a tab away', async ({ page }) => {
  await page.goto(performance)
  await expect(page).toHaveURL(/\/performance\/transaction-groups/)
  const rows = page.getByRole('list', { name: 'Transactions' }).getByRole('listitem')
  await expect(rows.first()).toContainText('/api/payments/momo/charge')

  await page.getByRole('link', { name: /^Failing/ }).click()
  await expect(rows.first()).toContainText('failed')
  await expect(rows.filter({ hasText: 'GET /api/policies/' })).toHaveCount(0)
})

test('a transaction shows where an average request spends its time', async ({ page }) => {
  await page.goto(performance)
  const row = page.getByRole('list', { name: 'Transactions' }).getByRole('link').filter({ hasText: /GET \/api\/policies\/(?!\{)/ })
  await row.click()
  const pane = page.getByRole('complementary', { name: 'Transaction' })
  await expect(pane.getByRole('heading', { level: 2 })).toContainText('/api/policies/')
  const spans = pane.getByRole('list', { name: 'Parts of a request, largest first' })
  await expect(spans).toContainText('SELECT "customers"')
  await expect(spans).toContainText('Not broken down')

  // The same transaction on a page of its own, where links to it land.
  await page.goto((await row.getAttribute('href'))!)
  await expect(page.getByRole('heading', { level: 2 })).toContainText('/api/policies/')
  await expect(page.getByRole('list', { name: 'Parts of a request, largest first' })).toContainText('per request')
})

test('a repeated query leads to the transaction that runs it', async ({ page }) => {
  await page.goto(performance)
  await page.getByRole('link', { name: /^Repeated queries/ }).click()
  await page.getByRole('list', { name: 'Repeated queries' }).getByRole('link').filter({ hasText: 'UPDATE "payments"' }).click()
  const pane = page.getByRole('complementary', { name: 'Repeated query' })
  await expect(pane.getByRole('heading', { level: 2 })).toHaveText(/^×\d+ per request$/)
  await expect(pane).toContainText('Share of request')

  await pane.getByRole('link', { name: 'Open transaction' }).click()
  await expect(page.getByRole('complementary', { name: 'Transaction' }).getByRole('heading', { level: 2 })).toContainText('payments.tasks.reconcile_statements')
})
