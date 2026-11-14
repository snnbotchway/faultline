import { expect, test } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

test('the support menu links to the docs and issue trackers', async ({ page }) => {
  await page.goto(`/${DEMO.org}/issues`)
  await page.getByRole('button', { name: 'Support' }).click()
  for (const name of ['Faultline docs', 'Faultline issues', 'GlitchTip docs', 'GlitchTip support']) {
    await expect(page.getByRole('menuitem', { name })).toHaveAttribute('href', /^https:\/\//)
  }
})

test('an unverified email can be sent its link again from any page', async ({ page }) => {
  await page.goto(`/${DEMO.org}/issues`)
  await page.getByRole('region', { name: 'Verify your email' }).getByRole('button', { name: 'Send verification email' }).click()
  await expect(page.getByRole('button', { name: 'Email sent' })).toBeDisabled()
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
