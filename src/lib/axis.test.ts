import { describe, expect, it } from 'vitest'
import { DAY } from './time'
import { position, releaseBefore, releaseMarks, shortName, spanAxis, type Axis } from './axis'

const seconds = (iso: string) => new Date(iso).getTime() / 1000
// Fourteen days, from Nov 1 to the end of Nov 14.
const axis: Axis = { start: seconds('2026-11-01T00:00:00Z'), size: DAY, count: 14 }

describe('release marks', () => {
  it('places a release on the axis, or nowhere when it is older than the period', () => {
    expect(position('2026-11-08T00:00:00Z', axis)).toBeCloseTo(0.5)
    expect(position('2026-10-01T00:00:00Z', axis)).toBeUndefined()
  })

  it('gives releases too close to tell apart one mark, labelled with the newest', () => {
    const release = (version: string, dateCreated: string) => ({ version, dateCreated })
    const marks = releaseMarks(
      [release('2.4.1', '2026-11-12T09:00:00Z'), release('2.3.0', '2026-11-04T00:00:00Z'), release('2.4.0', '2026-11-12T03:00:00Z'), release('1.0.0', '2026-09-01T00:00:00Z')],
      axis,
    )
    expect(marks.map((mark) => mark.label)).toEqual(['2.3.0', '2.4.1 +1'])
    expect(marks.map((mark) => mark.title)).toEqual(['2.3.0', '2.4.0, 2.4.1'])
  })

  it('names a release on the axis without its package or build, cut to fit', () => {
    expect(shortName('payments-api@2026.11.07+build.418')).toBe('2026.11.07')
    expect(shortName('2.4.1')).toBe('2.4.1')
    expect(shortName('a-very-long-release-name')).toBe('a-very-long…')
  })

  it('places a release on an exact stretch that ends now', () => {
    const axis = spanAxis(Date.parse('2026-11-14T00:00:00Z'), Date.parse('2026-11-14T10:00:00Z'))
    expect(position('2026-11-14T05:00:00Z', axis)).toBeCloseTo(0.5)
  })
})

describe('release before', () => {
  it('finds the newest release made before a moment, in a list in any order', () => {
    const releases = [{ dateCreated: '2026-11-03T00:00:00Z' }, { dateCreated: '2026-11-09T00:00:00Z' }, { dateCreated: '2026-11-05T00:00:00Z' }]
    expect(releaseBefore(releases, Date.parse('2026-11-08T00:00:00Z'))).toBe(releases[2])
    expect(releaseBefore(releases, Date.parse('2026-11-01T00:00:00Z'))).toBeUndefined()
  })
})
