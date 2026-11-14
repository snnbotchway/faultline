import { expect, test } from 'vitest'
import { countsByDay, sumDays, toUsageDays, totalOf, usageHours } from './usage'

test('logs and uptime checks are shown as what arrived, ten for every one the backend bills, and always whole', () => {
  // The figures GlitchTip 7.0.0 returned for 1,168 logs and 105 uptime checks, float noise included.
  const [day] = toUsageDays([{ date: '2026-11-14', eventCount: 499, transactionEventCount: 4810, logEventCount: 116.80000000000001, uptimeCheckEventCount: 10.5 }])
  expect(day!.counts).toEqual({ errors: 499, transactions: 4810, logs: 1168, uptime: 105 })
  expect(totalOf(day!.counts)).toBe(6582)
})

test('the period total is the sum of its days', () => {
  const days = toUsageDays([
    { date: '2026-11-13', eventCount: 31, transactionEventCount: 0, logEventCount: 2.3000000000000003, uptimeCheckEventCount: 0 },
    { date: '2026-11-14', eventCount: 103, transactionEventCount: 4810, logEventCount: 114.5, uptimeCheckEventCount: 10 },
  ])
  expect(sumDays(days)).toEqual({ errors: 134, transactions: 4810, logs: 1168, uptime: 100 })
})

test('hourly counts land on their UTC day, whatever offset the backend writes them in, and an empty hour counts as none', () => {
  const days = countsByDay(['2026-11-13T22:00:00+00:00', '2026-11-13T23:00:00+00:00', '2026-11-14T02:00:00+02:00', '2026-11-14T01:00:00+00:00'], [4, null, 5, 7])
  expect(days).toEqual({ '2026-11-13': 4, '2026-11-14': 12 })
})

test('the hours asked for are the ones that start inside the 30 days', () => {
  expect(usageHours(Date.parse('2026-11-14T22:40:39Z'))).toEqual({ start: '2026-10-15T23:00:00.000Z', end: '2026-11-14T22:00:00.000Z' })
})
