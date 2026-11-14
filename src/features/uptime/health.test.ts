import { describe, expect, it } from 'vitest'
import { Health, checkHealth, checkScale, downtimes, healthOf, percent, uptimeShare } from './health'
import { HOUR_MS, MINUTE_MS } from '@/lib/time'

const NOW = Date.parse('2026-11-14T12:00:00Z')
const MIN = MINUTE_MS
const at = (minutesAgo: number) => new Date(NOW - minutesAgo * MIN).toISOString()
const change = (minutesAgo: number, isUp: boolean, reason: number | null = isUp ? null : 2) => ({ startCheck: at(minutesAgo), isUp, reason, responseTime: null })
const passed = (responseTime: number) => ({ startCheck: at(1), isUp: true, reason: null, responseTime })

describe('downtimes', () => {
  it('pairs each fall with the recovery after it, newest first, and leaves the last one open', () => {
    // As the backend lists them: newest first, starting with the first check ever made.
    const changes = [change(10, false, 1), change(60, true), change(90, false, 5), change(600, true)]
    expect(downtimes(changes, NOW)).toEqual([
      { from: NOW - 10 * MIN, to: NOW, reason: 1, ongoing: true },
      { from: NOW - 90 * MIN, to: NOW - 60 * MIN, reason: 5, ongoing: false },
    ])
  })

  it('reads two falls in a row as one downtime from the first', () => {
    expect(downtimes([change(30, true), change(45, false), change(50, false, 1)], NOW)).toEqual([{ from: NOW - 50 * MIN, to: NOW - 30 * MIN, reason: 1, ongoing: false }])
  })
})

describe('healthOf', () => {
  const monitor = { isUp: true, timeout: 10 }

  it('waits for a monitor that has not been checked, and is down when the last check failed', () => {
    expect(healthOf({ isUp: null, timeout: 10 }, [], [], NOW).health).toBe(Health.waiting)
    expect(healthOf({ isUp: false, timeout: 10 }, [], [change(5, false)], NOW).health).toBe(Health.down)
  })

  it('is flapping when it went down three times in the last day, counting from the first of them', () => {
    const changes = [change(10, true), change(20, false), change(100, true), change(120, false), change(600, true), change(700, false), change(2000, true), change(2100, false)]
    expect(healthOf(monitor, [], changes, NOW)).toMatchObject({ health: Health.flapping, downs: 3, since: NOW - 700 * MIN })
    expect(healthOf(monitor, [], changes.slice(0, 4), NOW).health).toBe(Health.up)
  })

  it('is slow when a typical check takes more than half the timeout, and says so when it is also flapping', () => {
    expect(healthOf(monitor, [passed(4000), passed(6000), passed(7000)], [], NOW)).toMatchObject({ health: Health.slow, typical: 6000, slow: true })
    expect(healthOf(monitor, [passed(4000), passed(5000), passed(9000)], [], NOW)).toMatchObject({ health: Health.up, slow: false })
    const flapping = [change(10, true), change(20, false), change(30, true), change(40, false), change(50, true), change(60, false)]
    expect(healthOf(monitor, [passed(8000)], flapping, NOW)).toMatchObject({ health: Health.flapping, slow: true })
  })

  it('is never slow without a timeout, as for a heartbeat', () => {
    expect(healthOf({ isUp: true, timeout: null }, [passed(MIN)], [], NOW).health).toBe(Health.up)
  })
})

describe('checkHealth', () => {
  it('reads one check as down, slow (over half the timeout) or up', () => {
    expect(checkHealth({ isUp: false, responseTime: null }, 10)).toBe(Health.down)
    expect(checkHealth({ isUp: true, responseTime: 6000 }, 10)).toBe(Health.slow)
    expect(checkHealth({ isUp: true, responseTime: 5000 }, 10)).toBe(Health.up)
    expect(checkHealth({ isUp: true, responseTime: 6000 }, null)).toBe(Health.up)
  })
})

describe('checkScale', () => {
  it('scales to the timeout once a passed check is over the slow line, and to the peak before that', () => {
    const fast = [passed(400), passed(900), { ...passed(30_000), isUp: false }]
    expect(checkScale(fast, 10)).toEqual({ peak: 900, over: 5000, overLimit: false, ceiling: 900 })
    expect(checkScale([passed(6000), passed(1000)], 10)).toEqual({ peak: 6000, over: 5000, overLimit: true, ceiling: 10_000 })
  })

  it('has no slow line without a timeout, and never a zero ceiling', () => {
    expect(checkScale([], null)).toEqual({ peak: 0, over: undefined, overLimit: false, ceiling: 1 })
  })
})

describe('uptimeShare', () => {
  const DAY = 24 * HOUR_MS
  const H = 60

  it('is the share of the window not spent down, counting only the part of a downtime inside it', () => {
    // Down 6h-3h ago, and from 30h ago until 20h ago, of which the last 4h are in the window.
    const changes = [change(3 * H, true), change(6 * H, false), change(20 * H, true), change(30 * H, false), change(50 * H, true)]
    expect(uptimeShare({ changes, toFirst: false }, at(60 * H), NOW, DAY)).toEqual({ share: expect.closeTo(1 - 7 / 24), sinceFirst: false })
  })
  it('counts a monitor younger than the window from its first check, down as it may have been', () => {
    const changes = [change(5 * H, true), change(10 * H, false)]
    expect(uptimeShare({ changes, toFirst: true }, at(9 * H), NOW, DAY)).toEqual({ share: 0.5, sinceFirst: true })
  })
  it('has no figure when the changes stop short of the window and the first check', () => {
    expect(uptimeShare({ changes: [change(3 * H, true), change(6 * H, false)], toFirst: false }, at(60 * H), NOW, DAY)).toBeUndefined()
  })
  it('has no figure for a monitor older than the window whose first checks the backend no longer keeps', () => {
    const changes = [change(5 * H, true), change(10 * H, false)]
    expect(uptimeShare({ changes, toFirst: true }, at(30 * 24 * H), NOW, DAY)).toBeUndefined()
  })
})

describe('percent', () => {
  it('does not round up to 100% while there was downtime', () => {
    expect(percent(0.99996)).toBe('99.9%')
    expect(percent(0.9923)).toBe('99.2%')
    expect(percent(1)).toBe('100%')
    expect(percent(0)).toBe('0%')
  })
})
