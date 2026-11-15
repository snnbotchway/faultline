import { expect, test, type Page } from '@playwright/test'

// A throwaway account with its own organization, so the demo user, which the other tests read in English, keeps its language.
test.use({ storageState: { cookies: [], origins: [] } })

const PASSWORD = 'quiet-harbour-7341'
const ORG = `i18n-${Date.now().toString(36)}`

async function write(page: Page, method: 'POST' | 'DELETE', path: string, data?: unknown) {
  await page.request.get('/_allauth/browser/v1/auth/session')
  const csrf = (await page.context().cookies()).find((cookie) => cookie.name === 'csrftoken')?.value ?? ''
  const origin = new URL(test.info().project.use.baseURL!).origin
  return page.request.fetch(path, { method, data, headers: { 'x-csrftoken': csrf, origin } })
}

test.beforeEach(async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  expect((await write(page, 'POST', '/_allauth/browser/v1/auth/signup', { email, password: PASSWORD })).ok()).toBe(true)
  expect((await write(page, 'POST', '/api/0/organizations/', { name: ORG })).ok()).toBe(true)
})

test.afterEach(async ({ page }) => {
  await write(page, 'DELETE', `/api/0/organizations/${ORG}/`)
  await write(page, 'DELETE', '/api/0/users/me/')
})

test('someone switches to French, sees the shell and settings in French, and it sticks after a reload', async ({ page }) => {
  await page.goto('/profile')
  await page.getByRole('button', { name: /^Language/ }).click()
  // The pick is saved to the account; leaving the page before the save lands would lose it.
  const saved = page.waitForResponse((response) => response.url().endsWith('/api/0/users/me/') && response.request().method() === 'PUT')
  await page.getByRole('menuitemradio', { name: 'Français' }).click()
  expect((await saved).ok()).toBe(true)
  await expect(page.getByRole('button', { name: /^Langue/ })).toContainText('Français')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')

  await page.goto(`/${ORG}/settings`)
  await expect(page.getByRole('heading', { name: 'Paramètres' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Problèmes' }).first()).toBeVisible()
  await expect(page.getByText('Zone de danger')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Paramètres' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  // The account keeps the choice too, so another browser opens in French.
  const me = await (await page.request.get('/api/0/users/me/')).json()
  expect(me.options.language).toBe('fr')
})
