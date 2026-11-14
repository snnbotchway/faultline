import { expect, test } from 'vitest'
import { countsByDay, toUsageCounts, totalOf, usageHours } from './usage'

test('logs and uptime checks are shown as what arrived, ten for every one the backend bills, and always whole', () => {
  // The figures GlitchTip 7.0.0 returned for 1,168 logs and 105 uptime checks, float noise included.
  const counts = toUsageCounts({ eventCount: 499, transactionEventCount: 4810, logEventCount: 116.80000000000001, uptimeCheckEventCount: 10.5 })
  expect(counts).toEqual({ errors: 499, transactions: 4810, logs: 1168, uptime: 105 })
  expect(totalOf(counts)).toBe(6582)
})

test("hourly counts land on the day the server's own time zone puts them in, and an empty hour counts as none", () => {
  // A server at UTC+2: its 01:00 on the 14th is 23:00 on the 13th in UTC, and the daily counts put it on the 14th.
  const days = countsByDay(['2026-11-13T23:00:00+02:00', '2026-11-14T00:00:00+02:00', '2026-11-14T01:00:00+02:00', '2026-11-14T02:00:00+02:00'], [4, null, 5, 7])
  expect(days).toEqual({ '2026-11-13': 4, '2026-11-14': 12 })
})

test('the hours asked for are the ones that start inside the 30 days', () => {
  expect(usageHours(Date.parse('2026-11-14T22:40:39Z'))).toEqual({ start: '2026-10-15T23:00:00.000Z', end: '2026-11-14T22:00:00.000Z' })
})
