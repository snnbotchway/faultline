import { expect, test } from 'vitest'
import { dayAt, dropRange, effectiveDropRate, rangeText, share, stepDay } from './usage'

test("a project's rate applies to what the organization's rate let through", () => {
  expect(effectiveDropRate(25, 10)).toBe(33)
  expect(effectiveDropRate(25, 0)).toBe(25)
  expect(effectiveDropRate(0, 10)).toBe(10)
  expect(effectiveDropRate(0, 0)).toBe(0)
})

test('either rate at 100 drops everything, and two partial rates never read as everything', () => {
  expect(effectiveDropRate(100, 0)).toBe(100)
  expect(effectiveDropRate(5, 100)).toBe(100)
  expect(effectiveDropRate(99, 99)).toBe(99)
})

test('the headline rate is one figure when every project drops the same share and a range when they differ', () => {
  expect(rangeText(dropRange(25, [0, 0]))).toBe('25%')
  expect(rangeText(dropRange(25, [0, 10]))).toBe('25–33%')
  expect(rangeText(dropRange(0, [0, 10]))).toBe('0–10%')
  expect(rangeText(dropRange(40, []))).toBe('40%')
})

test('a pointer picks the day whose column it is over, and the nearest day when it is past either end', () => {
  // 31 days across a chart 310px wide that starts 100px in: each day is 10px.
  expect(dayAt(100, 100, 310, 31)).toBe(0)
  expect(dayAt(345, 100, 310, 31)).toBe(24)
  expect(dayAt(409.9, 100, 310, 31)).toBe(30)
  expect(dayAt(20, 100, 310, 31)).toBe(0)
  expect(dayAt(900, 100, 310, 31)).toBe(30)
})

test('stepping moves a day at a time and stops at the ends; with no day picked it starts from the nearest end', () => {
  expect(stepDay(24, -1, 31)).toBe(23)
  expect(stepDay(24, 1, 31)).toBe(25)
  expect(stepDay(0, -1, 31)).toBe(0)
  expect(stepDay(30, 1, 31)).toBe(30)
  expect(stepDay(undefined, -1, 31)).toBe(30)
  expect(stepDay(undefined, 1, 31)).toBe(0)
})

test('a share too small to round to one percent still shows', () => {
  expect(share(2, 38)).toBe('5%')
  expect(share(1, 4810)).toBe('<1%')
  expect(share(0, 4810)).toBe('0%')
  expect(share(0, 0)).toBe('0%')
})
