import { describe, expect, it } from 'vitest'
import { validatePerformanceSearch } from './search'

describe('performance links', () => {
  it("keep a stock link's sorting, which it calls `sort`", () => {
    expect(validatePerformanceSearch({ sort: '-count' }).order).toBe('-count')
    expect(validatePerformanceSearch({ order: 'avg_duration', sort: '-count' }).order).toBe('avg_duration')
  })

  it('drop an order the list does not know, and read project ids as numbers', () => {
    expect(validatePerformanceSearch({ sort: '-title', project: ['2', '3'] })).toMatchObject({ order: undefined, project: [2, 3] })
  })
})
