import { describe, expect, it } from 'vitest'
import { CountState } from '@/lib/format'
import { hourly, projectCount, totalOf } from './data'

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

describe('a project count', () => {
  const counted = { state: CountState.counted, hits: { n: 7, capped: false } } as const
  const zero = { state: CountState.counted, hits: { n: 0, capped: false } }
  const unavailable = { state: CountState.unavailable }

  it('is its own count when it is among the projects counted', () => {
    expect(projectCount({ stats: counted, withLogs: true, filtered: false, complete: true })).toEqual(counted)
  })

  it('is not known for a project with logs past the ones counted', () => {
    expect(projectCount({ stats: undefined, withLogs: true, filtered: false, complete: true })).toEqual(unavailable)
  })

  it('is not known for a project that a project filter leaves out', () => {
    expect(projectCount({ stats: undefined, withLogs: false, filtered: true, complete: true })).toEqual(unavailable)
  })

  it('is zero only once the whole list is loaded with no project filter and none of its logs', () => {
    expect(projectCount({ stats: undefined, withLogs: false, filtered: false, complete: true })).toEqual(zero)
    expect(projectCount({ stats: undefined, withLogs: false, filtered: false, complete: false })).toEqual(unavailable)
  })
})

describe('the total above the logs', () => {
  const hits = { n: 1000, capped: true }
  const base = { hits, buckets: undefined, spanLogs: 0, spanLoading: false, spanPartial: false }

  it("counts a span's logs once its trace's have loaded, and says there may be more past the limit", () => {
    const span = { traceId: 't', spanId: 's' }
    expect(totalOf({ ...base, search: span, spanLoading: true })).toBeUndefined()
    expect(totalOf({ ...base, search: span, spanLogs: 3 })).toEqual({ n: 3, capped: false })
    expect(totalOf({ ...base, search: span, spanLogs: 3, spanPartial: true })).toEqual({ n: 3, capped: true })
  })

  it('takes the hourly statistics when they can answer, and the list count when they cannot', () => {
    const buckets = [
      { start: 0, errors: 1, warnings: 2, other: 3 },
      { start: 3600, errors: 0, warnings: 0, other: 4 },
    ]
    expect(totalOf({ ...base, search: {}, buckets })).toEqual({ n: 10, capped: false })
    expect(totalOf({ ...base, search: { hour: 3600 }, buckets })).toEqual({ n: 4, capped: false })
    expect(totalOf({ ...base, search: { query: 'timeout' }, buckets })).toEqual(hits)
    expect(totalOf({ ...base, search: {} })).toEqual(hits)
  })
})
