import { expect, test, type Page } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

const inbox = `/${DEMO.org}/issues`
const row = (page: Page, shortId: string) => page.getByRole('listitem').filter({ hasText: shortId })

test('the inbox lists the seeded issues', async ({ page }) => {
  await page.goto(inbox)
  await expect(row(page, 'WEB-APP-1')).toContainText("Cannot read properties of undefined (reading 'premium')")
  await expect(row(page, 'PAYMENTS-API-2')).toContainText('TimeoutError')
})

test('an issue opens on its stack trace', async ({ page }) => {
  await page.goto(inbox)
  await row(page, 'WEB-APP-1').getByRole('link').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('TypeError')
  await expect(page.getByRole('heading', { name: 'Stack trace' })).toBeVisible()
  await expect(page.getByText('return quote.premium.amount.toFixed(2)')).toBeVisible()
})

test('an issue can be resolved and reopened from its page', async ({ page }) => {
  await page.goto(inbox)
  await row(page, 'PAYMENTS-API-4').getByRole('link').click()
  await page.getByRole('button', { name: 'Resolve', exact: false }).first().click()
  await expect(page.getByText('Resolved', { exact: true })).toBeVisible()

  await page.goto(inbox)
  await expect(row(page, 'WEB-APP-1')).toBeVisible()
  await expect(row(page, 'PAYMENTS-API-4')).toHaveCount(0)

  await page.getByRole('button', { name: 'Resolved', exact: true }).click()
  await row(page, 'PAYMENTS-API-4').getByRole('link').click()
  await page.getByRole('button', { name: 'Unresolve' }).click()
  await expect(page.getByText('Unresolved', { exact: true })).toBeVisible()
})

test('two selected issues are resolved together', async ({ page }) => {
  await page.goto(inbox)
  await page.getByRole('checkbox', { name: 'Select MOBILE-1' }).click()
  await page.getByRole('checkbox', { name: 'Select MOBILE-2' }).click()
  const selection = page.getByRole('toolbar', { name: 'Selection' })
  await expect(selection).toContainText('2 selected')
  await selection.getByRole('button', { name: 'Resolve' }).click()
  await expect(row(page, 'MOBILE-1')).toHaveCount(0)
  await expect(row(page, 'MOBILE-2')).toHaveCount(0)

  await page.getByRole('button', { name: 'Resolved', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Select MOBILE-1' }).click()
  await page.getByRole('checkbox', { name: 'Select MOBILE-2' }).click()
  await selection.getByRole('button', { name: 'Unresolve' }).click()
  await expect(row(page, 'MOBILE-1')).toHaveCount(0)
  await page.getByRole('button', { name: 'Unresolved', exact: true }).click()
  await expect(row(page, 'MOBILE-2')).toBeVisible()
})
