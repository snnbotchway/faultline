import { describe, expect, it } from 'vitest'
import { hourly } from './data'

const now = Date.parse('2026-11-14T12:30:00Z')

describe('logs per hour', () => {
  it('fill the window up to the current hour, sorting levels into errors, warnings and the rest', () => {
    const buckets = hourly(
      {
        intervals: ['2026-11-14T10:00:00Z', '2026-11-14T12:00:00Z', '2026-11-13T09:00:00Z'],
        series: [
          { name: 'fatal', data: [1, 0, 5] },
          { name: 'error', data: [2, 1, 5] },
          { name: 'warn', data: [0, 3, 5] },
          { name: 'info', data: [7, 4, 5] },
          { name: 'trace', data: [1, 0, 5] },
        ],
      },
      3,
      now,
    )
    expect(buckets.map(({ errors, warnings, other }) => [errors, warnings, other])).toEqual([
      [3, 0, 8],
      [0, 0, 0],
      [1, 3, 4],
    ])
    expect(buckets[2]!.start).toBe(Date.parse('2026-11-14T12:00:00Z') / 1000)
  })
})
