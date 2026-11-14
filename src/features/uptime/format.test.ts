import { describe, expect, it } from 'vitest'
import { DAY_MS, HOUR_MS, MINUTE_MS } from '@/lib/time'
import { every, span } from './format'

describe('span', () => {
  it('rounds to the minute and never says less than one', () => {
    expect(span(10_000)).toBe('1m')
    expect(span(14 * MINUTE_MS)).toBe('14m')
  })

  it('adds minutes to hours, and hours to days only while there are few days', () => {
    expect(span(3 * HOUR_MS)).toBe('3h')
    expect(span(3 * HOUR_MS + 20 * MINUTE_MS)).toBe('3h 20m')
    expect(span(2 * DAY_MS + 4 * HOUR_MS)).toBe('2d 4h')
    expect(span(9 * DAY_MS + 4 * HOUR_MS)).toBe('9d')
  })
})

describe('every', () => {
  it('names one of a unit without a number, and more with one', () => {
    expect(every(60)).toBe('minute')
    expect(every(300)).toBe('5 minutes')
    expect(every(3600)).toBe('hour')
    expect(every(86_400)).toBe('day')
    expect(every(2 * 86_400)).toBe('2 days')
  })

  it('falls back to seconds when the interval is not a whole minute', () => {
    expect(every(90)).toBe('90 seconds')
  })
})
