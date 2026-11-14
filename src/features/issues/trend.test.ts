import { describe, expect, it } from 'vitest'
import { StatsPeriod } from '@/api/issues'
import { axisFor, barHeights, classify, fillBuckets, markLabels, position, releaseMarks } from './trend'

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

  it('puts an hour of the day view in its own bucket', () => {
    const buckets = fillBuckets([[seconds('2026-11-14T11:00:00Z'), 3]], axisFor(StatsPeriod.day, now))
    expect(buckets.slice(-3)).toEqual([0, 3, 0])
  })

  it('places a release on the axis, or nowhere when it is older than the period', () => {
    const axis = axisFor(StatsPeriod.fortnight, now)
    expect(position('2026-11-08T00:00:00Z', axis)).toBeCloseTo(0.5)
    expect(position('2026-10-01T00:00:00Z', axis)).toBeUndefined()
  })

  it('marks each release on the axis, oldest first, with commit hashes cut to seven characters', () => {
    const axis = axisFor(StatsPeriod.fortnight, now)
    const release = (shortVersion: string, dateCreated: string) => ({ shortVersion, dateCreated })
    const marks = releaseMarks(
      [
        release('2.4.1', '2026-11-12T09:00:00Z'),
        release('a30f4726113a06a8e2702987b4127aa0d3b4c1e5', '2026-11-04T00:00:00Z'),
        release('1.0.0', '2026-09-01T00:00:00Z'),
      ],
      axis,
    )
    expect(marks.map((mark) => mark.version)).toEqual(['a30f472', '2.4.1'])
  })
})

describe('release labels', () => {
  // Widths are chosen against the label size estimate in trend.ts (7.2px a character, 12px around each label).
  const mark = (at: number, version: string) => ({ at, version })

  it('names each release that has room for its label', () => {
    expect(markLabels([mark(0.1, '2.3.0'), mark(0.5, '2.4.0')], 600).map((label) => label.text)).toEqual(['2.3.0', '2.4.0'])
  })

  it('folds releases whose labels would collide into one, named after the newest', () => {
    const marks = [mark(0.1, '2.3.0'), mark(0.5, 'a30f472'), mark(0.52, '71b3d06'), mark(0.54, 'c2f9e10')]
    expect(markLabels(marks, 600).map((label) => label.text)).toEqual(['2.3.0', 'c2f9e10 +2'])
    expect(markLabels(marks, 6000).map((label) => label.text)).toEqual(['2.3.0', 'a30f472', '71b3d06', 'c2f9e10'])
  })

  it('starts a label at its mark, moved left only as far as it needs to stay on the chart', () => {
    expect(markLabels([mark(0.7, '2.4.0')], 600)).toEqual([{ at: 0.7, text: '2.4.0', left: 420 }])
    expect(markLabels([mark(0.95, '2.4.0')], 600)).toEqual([{ at: 0.95, text: '2.4.0', left: 552 }])
    expect(markLabels([mark(0.7, 'a30f472'), mark(0.72, '71b3d06')], 260)).toEqual([{ at: 0.7, text: '71b3d06 +1', left: 176 }])
  })

  it('never moves a label past the left edge of the chart', () => {
    const [label] = markLabels([mark(0.5, 'my-service@1.12.0-rc.1')], 260)
    expect(label?.left).toBeCloseTo(89.6)
    expect(markLabels([mark(0.5, 'a30f4726113a06a8e2702987b4127aa0d3b4c1e5')], 200)[0]?.left).toBe(0)
  })

  it('folds a label at the right edge into the one before when they would meet', () => {
    const [label, ...rest] = markLabels([mark(0.85, '2.4.0'), mark(0.9, '2.4.1')], 400)
    expect(rest).toEqual([])
    expect(label?.text).toBe('2.4.1 +1')
    expect(label?.left).toBeCloseTo(330.4)
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
