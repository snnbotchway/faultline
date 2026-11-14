import { expect, test } from '@playwright/test'

test('serves the app and reaches the backend on the same origin', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Faultline$/)
  const settings = await page.request.get('/api/settings/')
  expect((await settings.json()).version).toBeTruthy()
})
