import { describe, expect, it } from 'vitest'
import { Health, downtimes, healthOf } from './health'

const NOW = Date.parse('2026-11-14T12:00:00Z')
const MIN = 60_000
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
    expect(healthOf({ isUp: true, timeout: null }, [passed(60_000)], [], NOW).health).toBe(Health.up)
  })
})
