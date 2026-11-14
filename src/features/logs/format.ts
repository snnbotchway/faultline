import type { LogEvent } from '@/api/logs'

const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hour12: false })
const day = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

// `13:35:30.495`: logs are read to the millisecond.
export const clockTime = (time: string) => clock.format(new Date(time))
export const dayOf = (time: string | number) => day.format(new Date(time))
export const fullTime = (time: string) => `${dayOf(time)} ${clockTime(time)}`

// SDKs prefix their own attributes with their vendor's name; the screen shows `release`, not `sentry.release`.
const VENDOR_PREFIX = /^sentry\./
const plainKey = (key: string) => key.replace(VENDOR_PREFIX, '')

// Everything a log carries, by name and sorted. When an application sets a name the SDK also sets
// (`release` and `sentry.release`), the application's value is shown.
export function attributes(log: LogEvent): [string, unknown][] {
  const named = new Map<string, unknown>()
  for (const [key, value] of Object.entries(log.data ?? {})) {
    const name = plainKey(key)
    if (name === key || !named.has(name)) named.set(name, value)
  }
  return [...named].sort(([a], [b]) => a.localeCompare(b))
}

const PREVIEW = 3
// The first few attributes an application set itself, for the row in the list.
export const preview = (log: LogEvent) =>
  Object.entries(log.data ?? {})
    .filter(([key]) => !VENDOR_PREFIX.test(key))
    .slice(0, PREVIEW)
