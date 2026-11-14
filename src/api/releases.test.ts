import { describe, expect, it } from 'vitest'
import { canOpenRelease, countNewIssues, eventsPerDay } from './releases'

// Local times, so the test reads the same in any time zone.
const local = (day: number, hour: number) => new Date(2026, 10, day, hour)

describe('events per day', () => {
  it("adds up each hour into the viewer's day it falls in, and leaves days without events at zero", () => {
    const start = local(12, 0).getTime()
    const hours = [local(12, 0), local(12, 23), local(13, 0), local(14, 9)].map((time) => time.toISOString())
    expect(eventsPerDay(hours, [2, 3, null, 5], start, 4)).toEqual([5, 0, 5, 0])
  })

  it('drops hours outside the days asked for', () => {
    const start = local(12, 0).getTime()
    expect(eventsPerDay([local(11, 23).toISOString(), local(13, 1).toISOString()], [7, 1], start, 2)).toEqual([0, 1])
  })
})

describe('releases the backend can open', () => {
  it('cannot open a version with a slash, which its paths never match', () => {
    expect(canOpenRelease('web@1.2.0+build.4')).toBe(true)
    expect(canOpenRelease('web/1.2')).toBe(false)
  })
})

describe('new issues per release', () => {
  it('says the counts cover every release only when the page of issues was not full', () => {
    const issue = (version: string, firstSeen: string) => ({ firstRelease: { version } as never, firstSeen })
    const issues = [issue('2.0', '2026-11-14T00:00:00Z'), issue('2.0', '2026-11-13T00:00:00Z'), issue('1.9', '2026-11-10T00:00:00Z')]
    expect(countNewIssues(issues, false)).toEqual({ counts: new Map([['2.0', 2], ['1.9', 1]]), complete: true, since: undefined })
    expect(countNewIssues(issues, true).since).toBe('2026-11-10T00:00:00Z')
  })
})
