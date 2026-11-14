import { describe, expect, it } from 'vitest'
import { averageRequest, regression, releaseAt, shareOfRequest, spanTimePerRequest, weekAxis } from './measures'

const axis = weekAxis(new Date('2026-11-14T12:30:00Z'))
const day = (date: string, totalTime: number, transactionCount: number) => ({ date, totalTime, transactionCount, count: 0, avgDuration: 0 })
const span = (op: string, count: number, totalTime: number) => ({ op, description: op, count, totalTime, avgDuration: totalTime / count, p95Duration: 0 })

describe('time in spans per request', () => {
  it('puts each day on the week ending today, per request, and drops days outside it', () => {
    const time = spanTimePerRequest(
      [
        day('2026-11-13', 600, 6),
        day('2026-11-14T00:00:00', 90, 3),
        day('2026-11-01', 999, 1),
      ],
      axis,
      3,
    )
    expect(time).toEqual([0, 0, 0, 0, 0, 300, 90])
  })
})

describe('slower this week', () => {
  it('flags the last two days well above the days before, from the day it rose', () => {
    expect(regression([100, 100, 100, 100, 100, 200, 220])).toEqual({ factor: 2.1, since: 5 })
    expect(regression([100, 100, 100, 100, 160, 200, 220])?.since).toBe(4)
  })

  it('dates the rise from where it lasted, not from an earlier one-day spike', () => {
    expect(regression([100, 150, 100, 100, 100, 200, 220])?.since).toBe(5)
  })

  it('stays quiet when the rise is small or there are too few earlier days to compare with', () => {
    expect(regression([100, 100, 100, 100, 100, 120, 130])).toBeUndefined()
    expect(regression([0, 0, 0, 0, 100, 300, 300])).toBeUndefined()
  })
})

describe('release behind a regression', () => {
  it('is the release that went out on the day it started or the evening before', () => {
    expect(releaseAt([{ at: 0.7, label: '1.5.0' }], axis, 5)).toBe('1.5.0')
    expect(releaseAt([{ at: 0.66, label: '1.5.0' }], axis, 5)).toBe('1.5.0')
    expect(releaseAt([{ at: 0.4, label: '1.4.1' }], axis, 5)).toBeUndefined()
  })
})

describe('average request', () => {
  it('splits a request by span group, largest first, with the rest outside spans', () => {
    const trend = [day('2026-11-14', 0, 20)]
    const request = averageRequest({ count: 10, avgDuration: 300 }, [span('cache', 20, 1000), span('db', 60, 1200)], trend)
    expect(request.rows.map(({ op, times, time, repeats }) => ({ op, times, time, repeats }))).toEqual([
      { op: 'db', times: 6, time: 120, repeats: true },
      { op: 'cache', times: 2, time: 100, repeats: false },
    ])
    expect(request.total).toBe(300)
    expect(request.outside).toBe(80)
  })

  it('takes the time in spans as the whole request when it is longer than the average', () => {
    const trend = [day('2026-11-14', 0, 10)]
    const request = averageRequest({ count: 10, avgDuration: 150 }, [span('db', 10, 2200)], trend)
    expect(request.total).toBe(220)
    expect(request.outside).toBe(0)
  })
})

describe('share of request', () => {
  it('is the time a repeated query takes out of the average request', () => {
    const { perRequest, share } = shareOfRequest({ spansPerTxn: 44, avgDuration: 6 }, 728)
    expect(perRequest).toBe(264)
    expect(share).toBeCloseTo(0.363, 3)
  })

  it('is all of it when the query alone takes longer than the average', () => {
    expect(shareOfRequest({ spansPerTxn: 50, avgDuration: 40 }, 1500).share).toBe(1)
  })

  it('is unknown without the transaction, as when its name is shared', () => {
    expect(shareOfRequest({ spansPerTxn: 50, avgDuration: 40 }, undefined)).toEqual({ perRequest: 2000 })
  })
})
