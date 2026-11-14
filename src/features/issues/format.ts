import { DAY } from '@/lib/time'

const STEPS: [number, string][] = [
  [60, 's'],
  [60, 'm'],
  [24, 'h'],
  [30, 'd'],
  [Infinity, 'mo'],
]

// `7m`, `3h`, `2d`: how long ago, short enough for a table cell.
export function ago(time: string | Date, now = new Date()): string {
  let value = Math.max(0, (now.getTime() - new Date(time).getTime()) / 1000)
  for (const [size, unit] of STEPS) {
    if (value < size) return `${Math.floor(value)}${unit}`
    value /= size
  }
  return ''
}

// `Nov 14, 12:54 PM`: the moment without the year or seconds, for narrow screens.
const briefFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
export const brief = (time: string | Date) => briefFormat.format(new Date(time))

const exactFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' })
export const exact = (time: string | Date) => exactFormat.format(new Date(time))

const compactFormat = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
export const compact = (count: number | string) => compactFormat.format(Number(count)).toLowerCase()

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const hourFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
export const dayLabel = (seconds: number) => dayFormat.format(new Date(seconds * 1000))
// `14:02`: the time of day of a moment.
export const clock = (time: string | Date) => hourFormat.format(new Date(time))
export const hourLabel = (seconds: number) => clock(new Date(seconds * 1000))

// `Today`, `Yesterday`, or the date, in the viewer's time zone.
export function dayName(time: Date, now: Date): string {
  const days = Math.floor((new Date(now).setHours(24, 0, 0, 0) - time.getTime()) / DAY)
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : dayFormat.format(time)
}

// `Yesterday 14:02`: a moment within the last few days, in words a person on call reads at a glance.
export const dayTime = (time: Date, now: Date) => `${dayName(time, now)} ${clock(time)}`

// `issue` or `issues`, for a count shown apart from its word. `count` may already be worded (`1000+`).
export const noun = (count: number | string, word: string) => `${word}${String(count) === '1' ? '' : 's'}`
