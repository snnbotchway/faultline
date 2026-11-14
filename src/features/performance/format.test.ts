import { describe, expect, it } from 'vitest'
import { formatMs, formatPercent, formatTimes } from './format'

describe('durations', () => {
  it('are written in the unit a person would say them in', () => {
    expect([4, 4.2, 173.4, 7460, 12_345, 174_000, 3_900_000].map(formatMs)).toEqual(['4 ms', '4.2 ms', '173 ms', '7.46 s', '12.3 s', '2m 54s', '1h 5m'])
  })
})

describe('percentages', () => {
  it('keep one decimal below ten, none above, and never round a share down to zero', () => {
    expect([0, 0.05, 5, 9.44, 13.2].map(formatPercent)).toEqual(['0%', '<0.1%', '5%', '9.4%', '13%'])
  })
})

describe('repeats', () => {
  it('are a count with a times sign', () => {
    expect([1, 1.04, 2.5, 44.4].map(formatTimes)).toEqual(['×1', '×1', '×2.5', '×44'])
  })
})
