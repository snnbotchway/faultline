import { Locale, currentLocale, hourStyle, localized, messages, type Messages } from '@/i18n'
import { DAY_MS } from '@/lib/time'

const STEPS: [number, keyof Messages['common']['time']['ago']][] = [
  [60, 'seconds'],
  [60, 'minutes'],
  [24, 'hours'],
  [30, 'days'],
  [Infinity, 'months'],
]

// `7m`, `3h`, `2d`: how long ago, short enough for a table cell.
export function ago(time: string | Date, now = new Date()): string {
  const units = messages().common.time.ago
  let value = Math.max(0, (now.getTime() - new Date(time).getTime()) / 1000)
  for (const [size, unit] of STEPS) {
    if (value < size) return units[unit](Math.floor(value))
    value /= size
  }
  return ''
}

// `Nov 14, 12:54 PM`: the moment without the year or seconds, for narrow screens.
const briefFormat = localized((tag) => new Intl.DateTimeFormat(tag, { month: 'short', day: 'numeric', hour: hourStyle(tag), minute: '2-digit' }))
export const brief = (time: string | Date) => briefFormat().format(new Date(time))

const exactFormat = localized((tag) => new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'medium' }))
export const exact = (time: string | Date) => exactFormat().format(new Date(time))

const compactFormat = localized((tag) => new Intl.NumberFormat(tag, { notation: 'compact', maximumFractionDigits: 1 }))
// "1.2k" in English; other languages keep their case, as French "1,2 M" lowercased would read as metres.
export const compact = (count: number | string) => {
  const text = compactFormat().format(Number(count))
  return currentLocale() === Locale.en ? text.toLowerCase() : text
}

const dayFormat = localized((tag) => new Intl.DateTimeFormat(tag, { month: 'short', day: 'numeric' }))
const hourFormat = localized((tag) => new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit', hour12: false }))
export const dayLabel = (seconds: number) => dayFormat().format(new Date(seconds * 1000))
export const hourLabel = (seconds: number) => hourFormat().format(new Date(seconds * 1000))

// `2:02 PM`: the time of day of a moment, in the same style as `brief`.
const clockFormat = localized((tag) => new Intl.DateTimeFormat(tag, { hour: hourStyle(tag), minute: '2-digit' }))
export const clock = (time: string | Date) => clockFormat().format(new Date(time))

// `Today`, `Yesterday`, or the date, in the viewer's time zone.
export function dayName(time: Date, now: Date): string {
  const days = Math.floor((new Date(now).setHours(24, 0, 0, 0) - time.getTime()) / DAY_MS)
  const words = messages().common.time
  return days === 0 ? words.today : days === 1 ? words.yesterday : dayFormat().format(time)
}

// `Yesterday 14:02`: a moment within the last few days, in words a person on call reads at a glance.
export const dayTime = (time: Date, now: Date) => `${dayName(time, now)} ${clock(time)}`

// `12 kB`, `1.4 MB`: a file's size, never shown as zero.
const kilobytes = localized((tag) => new Intl.NumberFormat(tag, { style: 'unit', unit: 'kilobyte', maximumFractionDigits: 0 }))
const megabytes = localized((tag) => new Intl.NumberFormat(tag, { style: 'unit', unit: 'megabyte', minimumFractionDigits: 1, maximumFractionDigits: 1 }))
export const bytes = (size: number) => (size >= 1_000_000 ? megabytes().format(size / 1_000_000) : kilobytes().format(Math.max(1, Math.round(size / 1000))))
