import { StatsPeriod } from '@/api/issues'
import { messages } from '@/i18n'
import { releaseName } from '@/lib/text'
import { DAY, HOUR, SECOND_MS } from '@/lib/time'
import { dayLabel, hourLabel } from './format'

// Each period the traces can show: its buckets.
export const PERIODS = [
  { value: StatsPeriod.day, size: HOUR, count: 24 },
  { value: StatsPeriod.fortnight, size: DAY, count: 14 },
] as const

// A period's buckets and how it is named on screen: its toggle, its unit and what its axis ends on.
export const periodInfo = (period: StatsPeriod) => {
  const item = PERIODS.find((candidate) => candidate.value === period)!
  return { ...item, ...messages().issues.inbox.periods[period] }
}

export type Axis = { start: number; size: number; count: number }

// The period's buckets, oldest first, ending with the one that contains `now`. Times are in seconds.
export function axisFor(period: StatsPeriod, now: Date): Axis {
  const { size, count } = periodInfo(period)
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

export type Mark = { at: number; version: string }

// Releases on the axis, oldest first.
export function releaseMarks(releases: { shortVersion: string; dateCreated: string }[], axis: Axis): Mark[] {
  return releases
    .flatMap((release) => {
      const at = position(release.dateCreated, axis)
      return at === undefined ? [] : [{ at, version: releaseName(release.shortVersion) }]
    })
    .sort((a, b) => a.at - b.at)
}

// `left` is where the label starts, in pixels from the chart's left edge. `releases` are the versions it names, newest first.
export type MarkLabel = { at: number; text: string; left: number; releases: string[] }

// Labels are text-xs Plex Mono: 0.6em a character. Each has the 4px padding of `pl-1` in `MarkLabels`, then an
// 8px gap before the next.
const LABEL_CHAR = 7.2
const LABEL_SPACE = 4 + 8

// The labels of the marks on a chart `width` pixels wide. Releases whose labels would run into each other, or into
// each other's rules, share one, placed at the oldest and named after the newest with a count of the others.
export function markLabels(marks: Mark[], width: number): MarkLabel[] {
  if (width <= 0) return []
  // `first` and `last` are the positions of the oldest and newest release in the group; `versions` run oldest first.
  type Group = { first: number; last: number; versions: string[] }
  const groups: Group[] = []
  const text = (group: Group) => {
    const newest = group.versions.at(-1) ?? ''
    return group.versions.length > 1 ? `${newest} +${group.versions.length - 1}` : newest
  }
  // A label starts at its rule, or ends there when it would run past the right edge; never past the left edge.
  const label = (group: Group) => {
    const x = group.first * width
    const size = text(group).length * LABEL_CHAR + LABEL_SPACE
    const from = x + size <= width ? x : Math.max(0, x - size)
    return { from, to: from + size }
  }
  // What a group covers: its label and every one of its rules, which no other label may cross.
  const extent = (group: Group) => {
    const { from, to } = label(group)
    return { from: Math.min(from, group.first * width), to: Math.max(to, group.last * width) }
  }
  for (const mark of marks) {
    let newer: Group = { first: mark.at, last: mark.at, versions: [mark.version] }
    groups.push(newer)
    let older = groups.at(-2)
    while (older && extent(older).to > extent(newer).from) {
      older.last = newer.last
      older.versions.push(...newer.versions)
      groups.pop()
      newer = older
      older = groups.at(-2)
    }
  }
  return groups.map((group) => ({ at: group.first, text: text(group), left: label(group).from, releases: [...group.versions].reverse() }))
}

// An axis over an exact stretch of time (milliseconds), for strips that end at now rather than at a bucket's edge.
export const spanAxis = (from: number, to: number): Axis => ({ start: from / SECOND_MS, size: (to - from) / SECOND_MS, count: 1 })

// The newest release made before a moment, from a list in any order.
export function releaseBefore<T extends { dateCreated: string }>(releases: T[], time: number): T | undefined {
  let found: T | undefined
  for (const release of releases) {
    const at = Date.parse(release.dateCreated)
    if (at < time && (!found || at > Date.parse(found.dateCreated))) found = release
  }
  return found
}

export const axisStartLabel = (period: StatsPeriod, start: number) => (period === StatsPeriod.day ? hourLabel(start) : dayLabel(start))
