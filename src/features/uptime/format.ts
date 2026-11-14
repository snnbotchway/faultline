import { plural } from '@/features/issues/format'
import { DAY, HOUR, MINUTE, SECOND } from '@/lib/time'

// `14m`, `3h 20m`, `2d 4h`, `9d`: how long something lasted, as exact as it is worth being.
export function span(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / MINUTE))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`
  return hours < 72 && hours % 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${Math.floor(hours / 24)}d`
}

export const responseText = (ms: number | null | undefined) => (ms == null ? '' : ms >= SECOND ? `${(ms / SECOND).toFixed(1)}s` : `${Math.round(ms)}ms`)

const UNITS: [number, string][] = [
  [DAY / SECOND, 'day'],
  [HOUR / SECOND, 'hour'],
  [MINUTE / SECOND, 'minute'],
  [1, 'second'],
]

// `minute`, `5 minutes`, `hour`, `day`: what follows "every".
export function every(seconds: number): string {
  const [size, word] = UNITS.find(([size]) => seconds % size === 0)!
  return seconds === size ? word : plural(seconds / size, word)
}
