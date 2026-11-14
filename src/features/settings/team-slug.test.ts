import { expect, test } from 'vitest'
import { teamSlugError } from './team-slug'

test('a name the backend would accept passes', () => {
  expect(teamSlugError(' platform_ops-2 ', ['core'])).toBeUndefined()
})

test('a name that is taken is refused here, because the backend answers it with a server error', () => {
  expect(teamSlugError('Core', ['core'])).toBe('There is already a team called #Core.')
})
