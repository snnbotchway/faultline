import { plural } from '@/lib/text'
import { DAY, HOUR, MINUTE, MINUTE_MS } from '@/lib/time'

// `14m`, `3h 20m`, `2d 4h`, `9d`: how long something lasted, as exact as it is worth being.
export function span(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / MINUTE_MS))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`
  return hours < 72 && hours % 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${Math.floor(hours / 24)}d`
}

const UNITS: [number, string][] = [
  [DAY, 'day'],
  [HOUR, 'hour'],
  [MINUTE, 'minute'],
  [1, 'second'],
]

// `minute`, `5 minutes`, `hour`, `day`: what follows "every".
export function every(seconds: number): string {
  const [size, word] = UNITS.find(([size]) => seconds % size === 0)!
  return seconds === size ? word : plural(seconds / size, word)
}
