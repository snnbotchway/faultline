import { expect, test } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

// The image served under /faultline/ in front of a GlitchTip with the same BASE_PATH; the project's baseURL ends in it.
test('signs in, reads data and reloads a deep link under a base path', async ({ page }) => {
  await page.goto(`${DEMO.org}/releases`)
  await expect(page).toHaveURL(/\/faultline\/login\?next=/)

  await page.getByLabel('Email').fill(DEMO.email)
  await page.getByLabel('Password').fill(DEMO.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(new RegExp(`/faultline/${DEMO.org}/releases$`))
  const sections = page.getByRole('navigation', { name: 'Sections' }).first()
  await expect(sections).toBeVisible()

  await sections.getByRole('link', { name: 'Issues' }).click()
  await expect(page).toHaveURL(new RegExp(`/faultline/${DEMO.org}/issues`))
  await page.reload()
  await expect(sections).toBeVisible()
})
