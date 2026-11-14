import { expect, test } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

const settings = `/${DEMO.org}/settings`
// The backend is shared between runs, so everything made here has its own name and is removed again.
const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}`

test('the home page lists the projects and leads to their issues', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  await page.getByRole('link', { name: 'Issues in web-app' }).click()
  await expect(page).toHaveURL(new RegExp(`/${DEMO.org}/issues\\?project=`))
})

test('a new project opens on its set-up step with its DSN, and can be deleted', async ({ page }) => {
  const name = unique('e2e-project')
  await page.goto(`${settings}/projects/new`)
  await page.getByLabel('Project name').fill(name)
  await page.getByRole('radio', { name: 'Django' }).click()
  await page.getByRole('button', { name: 'Create project' }).click()

  await expect(page).toHaveURL(new RegExp(`${settings}/projects/${name}$`))
  await expect(page.getByRole('status').filter({ hasText: 'Waiting for the first event' })).toBeVisible()
  await expect(page.getByRole('figure').filter({ hasText: 'settings.py' })).toContainText(/dsn="https?:\/\/[0-9a-f]{32}@/)

  await page.getByRole('link', { name: 'General' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByLabel(`Type ${name} to delete it`).fill(name)
  await page.getByRole('button', { name: 'Delete project' }).click()
  await expect(page).toHaveURL(new RegExp(`${settings}$`))
  await expect(page.getByRole('link', { name })).toHaveCount(0)
})

test('an invited person shows in the list until the invite is cancelled', async ({ page }) => {
  const email = `${unique('e2e-invite')}@example.com`
  await page.goto(`${settings}/members`)
  await page.getByRole('button', { name: 'Invite members' }).click()
  await page.getByLabel('Email addresses').fill(email)
  await page.getByRole('dialog').getByRole('button', { name: /^(Send invite|Create invite link)$/ }).click()
  // A server without email keeps the dialog open to hand over the link.
  const done = page.getByRole('button', { name: 'Done' })
  if (await done.isVisible().catch(() => false)) await done.click()

  const row = page.getByRole('button', { name: new RegExp(email) })
  await expect(row).toContainText('Invited')
  await row.click()
  await page.getByRole('button', { name: 'Cancel invite' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel invite' }).click()
  // The page behind an open dialog is hidden from roles, so wait for the dialog to go before looking for the row.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(row).toHaveCount(0)
})

test('a team can be created, refuses a name that is taken, and can be deleted', async ({ page }) => {
  const slug = unique('e2e-team')
  await page.goto(`${settings}/teams`)
  await page.getByRole('button', { name: 'New team' }).click()
  await page.getByLabel('Name').fill(DEMO.team)
  await page.getByRole('button', { name: 'Create team' }).click()
  await expect(page.getByRole('alert')).toContainText(`There is already a team called #${DEMO.team}.`)

  await page.getByLabel('Name').fill(slug)
  await page.getByRole('button', { name: 'Create team' }).click()
  await expect(page).toHaveURL(new RegExp(`${settings}/teams/${slug}/members$`))
  await expect(page.getByRole('region', { name: `Members of ${slug}` })).toContainText(DEMO.email)

  await page.getByRole('button', { name: 'Delete team' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete team' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: `Team ${slug}` })).toHaveCount(0)
})
