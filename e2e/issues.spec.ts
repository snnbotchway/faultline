import { expect, test, type Page } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

const inbox = `/${DEMO.org}/issues`
const row = (page: Page, text: string) => page.getByRole('listitem').filter({ hasText: text })

test('the inbox lists the seeded issues', async ({ page }) => {
  await page.goto(inbox)
  await expect(row(page, 'WEB-APP-1')).toContainText("Cannot read properties of undefined (reading 'premium')")
  await expect(row(page, 'Request failed with status code 503')).toBeVisible()
})

test('the inbox groups issues that are new, spiking and ongoing', async ({ page }) => {
  await page.goto(inbox)
  const spiking = page.getByRole('region', { name: 'Spiking' })
  await expect(spiking.getByRole('listitem')).toHaveCount(2)
  await expect(spiking).toContainText('Mobile money gateway did not respond within 30s')
  await expect(page.getByRole('region', { name: 'New' })).toContainText('Unexpected token < in JSON at position 0')
  await expect(page.getByRole('region', { name: 'Ongoing' })).toContainText('Invalid time value')
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
  await row(page, "'policy_number'").getByRole('link').click()
  await page.getByRole('button', { name: 'Resolve', exact: false }).first().click()
  await expect(page.getByText('Resolved', { exact: true })).toBeVisible()

  await page.goto(inbox)
  await expect(row(page, 'WEB-APP-1')).toBeVisible()
  await expect(row(page, "'policy_number'")).toHaveCount(0)

  await page.getByRole('button', { name: 'Resolved', exact: true }).click()
  await row(page, "'policy_number'").getByRole('link').click()
  await page.getByRole('button', { name: 'Unresolve' }).click()
  await expect(page.getByText('Unresolved', { exact: true })).toBeVisible()
})

test('two selected issues are resolved together', async ({ page }) => {
  await page.goto(inbox)
  await row(page, 'Request failed with status code 503').getByRole('checkbox').click()
  await row(page, 'Biometric prompt was cancelled').getByRole('checkbox').click()
  const selection = page.getByRole('toolbar', { name: 'Selection' })
  await expect(selection).toContainText('2 selected')
  await selection.getByRole('button', { name: 'Resolve' }).click()
  await expect(row(page, 'Request failed with status code 503')).toHaveCount(0)
  await expect(row(page, 'Biometric prompt was cancelled')).toHaveCount(0)

  await page.getByRole('button', { name: 'Resolved', exact: true }).click()
  await row(page, 'Request failed with status code 503').getByRole('checkbox').click()
  await row(page, 'Biometric prompt was cancelled').getByRole('checkbox').click()
  await selection.getByRole('button', { name: 'Unresolve' }).click()
  await expect(row(page, 'Request failed with status code 503')).toHaveCount(0)
  await page.getByRole('button', { name: 'Unresolved', exact: true }).click()
  await expect(row(page, 'Biometric prompt was cancelled')).toBeVisible()
})
