import { expect, test } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

test.use({ storageState: { cookies: [], origins: [] } })

test('a signed-out visitor signs in and lands on the page they asked for', async ({ page }) => {
  await page.goto(`/${DEMO.org}/releases`)
  await expect(page).toHaveURL(/\/login\?next=/)

  await page.getByLabel('Email').fill(DEMO.email)
  await page.getByLabel('Password').fill(DEMO.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(new RegExp(`/${DEMO.org}/releases$`))
  await expect(page.getByRole('navigation', { name: 'Sections' }).first()).toBeVisible()
})
