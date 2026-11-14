import { expect, test, type Page } from '@playwright/test'

// Every test signs up its own throwaway account, so the demo user's password and two-step setup are never touched.
test.use({ storageState: { cookies: [], origins: [] } })

const PASSWORD = 'quiet-harbour-7341'
const throwaway = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

async function csrf(page: Page) {
  await page.request.get('/_allauth/browser/v1/auth/session')
  return (await page.context().cookies()).find((cookie) => cookie.name === 'csrftoken')?.value ?? ''
}

async function write(page: Page, method: 'POST' | 'DELETE', path: string, data?: unknown) {
  const origin = new URL(test.info().project.use.baseURL!).origin
  return page.request.fetch(path, { method, data, headers: { 'x-csrftoken': await csrf(page), origin } })
}

const signUp = (page: Page, email: string) => write(page, 'POST', '/_allauth/browser/v1/auth/signup', { email, password: PASSWORD })
const deleteAccount = (page: Page) => write(page, 'DELETE', '/api/0/users/me/')

test('a visitor creates an account, then deletes it', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
  await page.getByLabel('Email').fill(throwaway())
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('No organization yet')).toBeVisible()

  await page.getByRole('link', { name: 'Profile' }).click()
  await page.getByRole('button', { name: /Delete account/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete account' }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('a visitor asks for a password reset link', async ({ page }) => {
  const email = throwaway()
  await page.goto('/login')
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()
})

test.describe('a signed-in account', () => {
  test.beforeEach(async ({ page }) => {
    expect((await signUp(page, throwaway())).ok()).toBe(true)
  })
  test.afterEach(async ({ page }) => {
    await deleteAccount(page)
  })

  test('changes its name and time zone', async ({ page }) => {
    await page.goto('/profile')
    await page.getByRole('button', { name: /^Name/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Name and time zone' })
    await dialog.getByLabel('Name').fill('Ama Mensah')
    await dialog.getByLabel('Time zone').fill('Africa/Accra')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: /^Name/ })).toContainText('Ama Mensah')
    await expect(page.getByRole('button', { name: /^Time zone/ })).toContainText('Africa/Accra')
  })

  test('makes an API token, then revokes it', async ({ page }) => {
    await page.goto('/profile')
    await page.getByRole('button', { name: 'New token' }).click()
    const form = page.getByRole('dialog', { name: 'New API token' })
    await form.getByLabel('Label').fill('deploy script')
    await form.getByRole('checkbox', { name: 'Releases' }).click()
    await form.getByRole('button', { name: 'Create token' }).click()

    const reveal = page.getByRole('dialog', { name: /Copy deploy script now/ })
    await expect(reveal.locator('code')).toHaveText(/^[0-9a-f]{64}$/)
    await reveal.getByRole('button', { name: 'Done' }).click()

    const row = page.getByRole('listitem').filter({ hasText: 'deploy script' })
    await expect(row).toContainText('Releases')
    await row.getByRole('button', { name: 'Revoke' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Revoke token' }).click()
    await expect(row).toBeHidden()
  })
})
