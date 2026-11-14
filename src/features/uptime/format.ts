import { dayLabel } from '@/features/issues/format'

const MINUTE = 60_000
const DAY = 86_400_000

// `14m`, `3h 20m`, `2d 4h`, `9d`: how long something lasted, as exact as it is worth being.
export function span(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / MINUTE))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`
  return hours < 72 && hours % 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${Math.floor(hours / 24)}d`
}

export const responseText = (ms: number | null | undefined) => (ms == null ? '' : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`)

// `minute`, `5 minutes`, `hour`, `day`: what follows "every".
export function every(seconds: number): string {
  const unit = (size: number, word: string) => (seconds === size ? word : `${seconds / size} ${word}s`)
  if (seconds % 86_400 === 0) return unit(86_400, 'day')
  if (seconds % 3600 === 0) return unit(3600, 'hour')
  if (seconds % 60 === 0) return unit(60, 'minute')
  return unit(1, 'second')
}

const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
export const clockTime = (time: string | number) => clock.format(new Date(time))

const stamp = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
export const stampTime = (time: string | number) => stamp.format(new Date(time))

// `Today`, `Yesterday`, or the date.
export function dayName(time: number, now: number): string {
  const days = Math.floor((new Date(now).setHours(24, 0, 0, 0) - time) / DAY)
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : dayLabel(time / 1000)
}

// `Yesterday 14:02`: a moment within the last few days, in words a person on call reads at a glance.
export const dayTime = (time: number, now: number) => `${dayName(time, now)} ${clockTime(time)}`
