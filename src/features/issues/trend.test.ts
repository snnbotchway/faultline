import { describe, expect, it } from 'vitest'
import { StatsPeriod } from '@/api/issues'
import { axisFor, barHeights, classify, fillBuckets, position } from './trend'

const now = new Date('2026-11-14T12:30:00Z')
const seconds = (iso: string) => new Date(iso).getTime() / 1000

describe('time axis', () => {
  it('fills the buckets the backend left out with zeros, ending at the current bucket', () => {
    const axis = axisFor(StatsPeriod.fortnight, now)
    const buckets = fillBuckets(
      [
        [seconds('2026-11-01T00:00:00Z'), 4],
        [seconds('2026-11-14T00:00:00Z'), 9],
        [seconds('2026-10-20T00:00:00Z'), 99],
      ],
      axis,
    )
    expect(buckets).toEqual([4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9])
  })

  it('uses hourly buckets for the day view', () => {
    const buckets = fillBuckets([[seconds('2026-11-14T11:00:00Z'), 3]], axisFor(StatsPeriod.day, now))
    expect(buckets).toHaveLength(24)
    expect(buckets.at(-2)).toBe(3)
  })

  it('places a release on the axis, or nowhere when it is older than the period', () => {
    const axis = axisFor(StatsPeriod.fortnight, now)
    expect(position('2026-11-08T00:00:00Z', axis)).toBeCloseTo(0.5)
    expect(position('2026-10-01T00:00:00Z', axis)).toBeUndefined()
  })
})

describe('trend', () => {
  it('calls an issue new for a day after it first appears', () => {
    expect(classify('2026-11-14T02:00:00Z', [0, 0, 40], now)).toBe('new')
  })

  it('calls an older issue spiking only when the latest bucket is well above its own average', () => {
    expect(classify('2026-10-01T00:00:00Z', [2, 3, 2, 3, 31], now)).toBe('spiking')
    expect(classify('2026-10-01T00:00:00Z', [20, 25, 22, 24, 31], now)).toBe('ongoing')
    expect(classify('2026-10-01T00:00:00Z', [0, 0, 0, 0, 2], now)).toBe('ongoing')
  })
})

describe('bar heights', () => {
  it('keeps a small count visible and an empty bucket on the baseline', () => {
    expect(barHeights([0, 1, 31, 62], 24)).toEqual([0, 2, 12, 24])
  })

  it('scales to a shared peak when one is given', () => {
    expect(barHeights([10], 20, 40)).toEqual([5])
  })
})
