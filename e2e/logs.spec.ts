import { expect, test } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

const logs = `/${DEMO.org}/logs`
const rows = (page: import('@playwright/test').Page) => page.getByRole('list', { name: 'Logs' }).getByRole('button')

test('logs can be searched and narrowed to a service', async ({ page }) => {
  await page.goto(logs)
  await page.getByRole('textbox', { name: 'Search messages' }).fill('gateway did not respond')
  await page.keyboard.press('Enter')
  await expect(rows(page).first()).toContainText('Mobile money gateway did not respond within 30s')
  for (const row of await rows(page).all()) await expect(row).toContainText('gateway did not respond')

  await page.goto(logs)
  await page.getByRole('radiogroup', { name: 'Service' }).getByRole('radio', { name: /payments-worker/ }).click()
  await expect(rows(page).first()).toContainText('payments-worker')
  await expect(rows(page).filter({ hasText: 'web-app' })).toHaveCount(0)
})

test('a log opens with its fields and leads to the other logs in its trace', async ({ page }) => {
  await page.goto(logs)
  await rows(page).filter({ hasText: 'Quote' }).first().click()
  const detail = page.getByRole('complementary', { name: 'Log' })
  await expect(detail).toContainText('Fields')
  await expect(detail).toContainText('service')

  await detail.getByRole('button', { name: 'Logs in this trace' }).click()
  await expect(page.getByRole('button', { name: /^Remove trace/ })).toBeVisible()
  await expect(rows(page).first()).toBeVisible()
})
