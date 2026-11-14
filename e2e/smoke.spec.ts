import { expect, test } from '@playwright/test'

// The image runs with a read-only root filesystem (dev/compose.yml), as a hardened deployment would.
test('serves the app and reaches the backend on the same origin', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  expect(response?.headers()['cache-control']).toBe('no-cache')
  await expect(page).toHaveTitle(/Faultline$/)
  const settings = await page.request.get('/api/settings/')
  expect((await settings.json()).version).toBeTruthy()
  expect((await page.request.get('/assets/missing.js')).status()).toBe(404)
  const redirect = await page.request.get('/admin/', { maxRedirects: 0 })
  expect(redirect.headersArray().filter((header) => header.name.toLowerCase() === 'location')).toHaveLength(1)
})
