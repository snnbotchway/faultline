import { expect, test } from 'vitest'
import { activityDays, dailyTotals } from './projects'

test('activity covers fourteen UTC days ending with today, whatever the hour', () => {
  const days = activityDays(new Date('2026-11-14T23:59:00Z')).map((day) => new Date(day).toISOString())
  expect(days).toHaveLength(14)
  expect(days[0]).toBe('2026-11-01T00:00:00.000Z')
  expect(days.at(-1)).toBe('2026-11-14T00:00:00.000Z')
})

test('hourly errors add up to UTC days, with an empty hour counted as none', () => {
  const totals = dailyTotals(['2026-11-13T22:00:00+00:00', '2026-11-13T23:00:00+00:00', '2026-11-14T01:00:00+01:00', '2026-11-14T05:00:00+00:00'], [2, null, 3, 4])
  expect(Object.fromEntries([...totals].map(([day, count]) => [new Date(day).toISOString().slice(0, 10), count]))).toEqual({ '2026-11-13': 2, '2026-11-14': 7 })
})
