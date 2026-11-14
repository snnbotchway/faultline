import type { LogEvent } from '@/api/logs'
import type { Count } from './data'

const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hour12: false })
const day = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const number = new Intl.NumberFormat('en')

// `13:35:30.495`: logs are read to the millisecond.
export const clockTime = (time: string) => clock.format(new Date(time))
export const dayOf = (time: string | number) => day.format(new Date(time))
export const fullTime = (time: string) => `${dayOf(time)} ${clockTime(time)}`
export const countText = (count: Count | undefined) => (count ? `${number.format(count.n)}${count.capped ? '+' : ''}` : '')

// SDKs prefix their own attributes with their vendor's name; the screen shows `release`, not `sentry.release`.
const VENDOR_PREFIX = /^sentry\./
export const plainKey = (key: string) => key.replace(VENDOR_PREFIX, '')

const PREVIEW = 3
// The first few attributes an application set itself, for the row in the list.
export const preview = (log: LogEvent) =>
  Object.entries(log.data ?? {})
    .filter(([key]) => !VENDOR_PREFIX.test(key))
    .slice(0, PREVIEW)
