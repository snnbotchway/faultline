import { StatsPeriod } from '@/api/issues'
import { dayLabel, hourLabel } from './format'

const HOUR = 3600
const DAY = 24 * HOUR
const BUCKETS = { [StatsPeriod.day]: { size: HOUR, count: 24 }, [StatsPeriod.fortnight]: { size: DAY, count: 14 } } as const

export type Axis = { start: number; size: number; count: number }

// The period's buckets, oldest first, ending with the one that contains `now`. Times are in seconds.
export function axisFor(period: StatsPeriod, now: Date): Axis {
  const { size, count } = BUCKETS[period]
  const last = Math.floor(now.getTime() / 1000 / size) * size
  return { start: last - (count - 1) * size, size, count }
}

// The backend sends only the buckets that have events; the gaps are zeros.
export function fillBuckets(points: number[][] | null | undefined, axis: Axis): number[] {
  const buckets = Array.from({ length: axis.count }, () => 0)
  for (const [time, count] of points ?? []) {
    if (time === undefined || count === undefined) continue
    const index = Math.floor((time - axis.start) / axis.size)
    if (index >= 0 && index < axis.count) buckets[index] = (buckets[index] ?? 0) + count
  }
  return buckets
}

// Where a moment falls on the axis, from 0 to 1; undefined when it is outside.
export function position(time: string | Date, axis: Axis): number | undefined {
  const at = (new Date(time).getTime() / 1000 - axis.start) / (axis.size * axis.count)
  return at >= 0 && at <= 1 ? at : undefined
}

export const Trend = { new: 'new', spiking: 'spiking', ongoing: 'ongoing' } as const
export type Trend = (typeof Trend)[keyof typeof Trend]

const SPIKE_FACTOR = 3
const SPIKE_FLOOR = 5

// New: first seen within a day. Spiking: the latest bucket is well above the issue's own average before it.
export function classify(firstSeen: string, buckets: number[], now: Date): Trend {
  if (now.getTime() - new Date(firstSeen).getTime() < DAY * 1000) return Trend.new
  const latest = buckets.at(-1) ?? 0
  const before = buckets.slice(0, -1)
  const average = before.reduce((sum, count) => sum + count, 0) / Math.max(1, before.length)
  return latest >= SPIKE_FLOOR && latest > average * SPIKE_FACTOR ? Trend.spiking : Trend.ongoing
}

const MIN_BAR = 2

// Bar heights in pixels. A bucket with any events stays visible; an empty one sits on the baseline.
export function barHeights(buckets: number[], height: number, peak = Math.max(...buckets, 0)): number[] {
  return buckets.map((count) => (count <= 0 || peak <= 0 ? 0 : Math.max(MIN_BAR, Math.round((count / peak) * height))))
}

export type Mark = { at: number; label: string }

const MARK_GAP = 0.05

// Releases on the axis. Ones that would overlap share a mark, labelled with the newest.
export function releaseMarks(releases: { shortVersion: string; dateCreated: string }[], axis: Axis): Mark[] {
  const placed = releases
    .flatMap((release) => {
      const at = position(release.dateCreated, axis)
      return at === undefined ? [] : [{ at, version: release.shortVersion }]
    })
    .sort((a, b) => a.at - b.at)
  const marks: (Mark & { count: number; version: string })[] = []
  for (const release of placed) {
    const last = marks.at(-1)
    if (last && release.at - last.at < MARK_GAP) {
      last.count += 1
      last.version = release.version
      last.label = `${last.version} +${last.count - 1}`
    } else marks.push({ at: release.at, label: release.version, version: release.version, count: 1 })
  }
  return marks.map(({ at, label }) => ({ at, label }))
}

export const PERIODS = [
  { value: StatsPeriod.day, label: '24h', unit: 'hour', now: 'Now' },
  { value: StatsPeriod.fortnight, label: '14d', unit: 'day', now: 'Today' },
] as const

export const periodInfo = (period: StatsPeriod) => PERIODS.find((item) => item.value === period)!

export const axisStartLabel = (period: StatsPeriod, start: number) => (period === StatsPeriod.day ? hourLabel(start) : dayLabel(start))
