import { expect, test } from 'vitest'
import { activityDays } from './projects'

test('activity covers fourteen UTC days ending with today, whatever the hour', () => {
  const days = activityDays(new Date('2026-11-14T23:59:00Z')).map((day) => new Date(day).toISOString())
  expect(days).toHaveLength(14)
  expect(days[0]).toBe('2026-11-01T00:00:00.000Z')
  expect(days.at(-1)).toBe('2026-11-14T00:00:00.000Z')
})
