import { expect, test } from 'vitest'
import { ago } from './format'

const now = new Date('2026-11-14T12:00:00Z')
const before = (seconds: number) => new Date(now.getTime() - seconds * 1000)

test('an age changes unit at the minute, the hour, the day and the month', () => {
  expect(ago(before(59), now)).toBe('59s')
  expect(ago(before(60), now)).toBe('1m')
  expect(ago(before(3599), now)).toBe('59m')
  expect(ago(before(3600), now)).toBe('1h')
  expect(ago(before(24 * 3600 - 1), now)).toBe('23h')
  expect(ago(before(24 * 3600), now)).toBe('1d')
  expect(ago(before(30 * 24 * 3600 - 1), now)).toBe('29d')
  expect(ago(before(30 * 24 * 3600), now)).toBe('1mo')
})

test('a time ahead of this clock reads as now', () => {
  expect(ago(before(-5), now)).toBe('0s')
})
