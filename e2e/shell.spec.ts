import { expect, test } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

test('an unverified email can be sent its link again from any page', async ({ page }) => {
  await page.goto(`/${DEMO.org}/issues`)
  const banner = page.getByRole('region', { name: 'Verify your email' })
  await banner.getByRole('button', { name: 'Send verification email' }).click()
  await expect(banner.getByRole('status')).toHaveText(`Sent to ${DEMO.email}`)
})

test('the theme follows the account, not just this browser', async ({ page }) => {
  await page.goto(`/${DEMO.org}/issues`)
  await page.getByRole('button', { name: 'Theme' }).click()
  await page.getByRole('menuitemradio', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  // The account has the choice once the save is answered; wait for that before leaving the page.
  await expect.poll(async () => (await (await page.request.get('/api/0/users/me/')).json()).options.preferredTheme).toBe('dark')

  await page.evaluate(() => localStorage.removeItem('theme'))
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.getByRole('button', { name: 'Theme' }).click()
  await page.getByRole('menuitemradio', { name: 'System' }).click()
  await expect.poll(async () => (await (await page.request.get('/api/0/users/me/')).json()).options.preferredTheme).toBe('system')
})
