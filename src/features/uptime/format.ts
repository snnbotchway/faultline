import type { StatsPeriod } from '@/api/issues'
import { periodInfo } from '@/features/issues/trend'
import { messages } from '@/i18n'
import type { IntervalUnit } from '@/i18n/en/uptime'
import { DAY, HOUR, MINUTE, MINUTE_MS, SECOND_MS } from '@/lib/time'

// `14m`, `3h 20m`, `2d 4h`, `9d` in English: how long something lasted, as exact as it is worth being.
export function span(ms: number): string {
  const unit = messages().common.time.ago
  const minutes = Math.max(1, Math.round(ms / MINUTE_MS))
  if (minutes < 60) return unit.minutes(minutes)
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return minutes % 60 ? `${unit.hours(hours)} ${unit.minutes(minutes % 60)}` : unit.hours(hours)
  const days = Math.floor(hours / 24)
  return hours < 72 && hours % 24 ? `${unit.days(days)} ${unit.hours(hours % 24)}` : unit.days(days)
}

const UNITS: [number, IntervalUnit][] = [
  [DAY, 'day'],
  [HOUR, 'hour'],
  [MINUTE, 'minute'],
  [1, 'second'],
]

const unitOf = (seconds: number) => {
  const [size, unit] = UNITS.find(([size]) => seconds % size === 0)!
  return { unit, amount: seconds / size }
}

// `minute`, `5 minutes`, `hour`, `day` in English: a choice of how often.
export function every(seconds: number): string {
  const { unit, amount } = unitOf(seconds)
  return messages().uptime.interval(unit, amount)
}

// `every minute`, `every 5 minutes`: how often, in a sentence.
export function everyPhrase(seconds: number): string {
  const { unit, amount } = unitOf(seconds)
  return messages().uptime.every(unit, amount)
}

// How far back a downtime strip reaches for a period (24h or 14d), in milliseconds.
export const periodLength = (period: StatsPeriod) => periodInfo(period).size * periodInfo(period).count * SECOND_MS
