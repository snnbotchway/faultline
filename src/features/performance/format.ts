import { localized, messages } from '@/i18n'

// A number with a fixed or a trimmed number of decimals, in the language's own separators: `7.46`, `7,46`.
const digits = (min: number, max: number) => localized((tag) => new Intl.NumberFormat(tag, { minimumFractionDigits: min, maximumFractionDigits: max }))
const tenth = digits(0, 1)
const oneDecimal = digits(1, 1)
const twoDecimals = digits(2, 2)
const percents = localized((tag) => new Intl.NumberFormat(tag, { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 }))
const wholePercents = localized((tag) => new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 0 }))

// A duration in the unit a person would say it in: `4.2 ms`, `173 ms`, `7.46 s`, `2m 54s`. Each unit
// stops where its rounding would reach the next, so 59.99 s reads `1m 0s`, not `60.0 s`.
export function formatMs(value: number): string {
  const t = messages().performance.duration
  if (value < 9.95) return t.milliseconds(tenth().format(value))
  if (value < 999.5) return t.milliseconds(String(Math.round(value)))
  if (value < 9_995) return t.seconds(twoDecimals().format(value / 1000))
  if (value < 59_950) return t.seconds(oneDecimal().format(value / 1000))
  const seconds = Math.round(value / 1000)
  if (seconds < 3600) return t.minutes(Math.floor(seconds / 60), seconds % 60)
  const minutes = Math.round(value / 60_000)
  return t.hours(Math.floor(minutes / 60), minutes % 60)
}

// One decimal below ten, none above, and never a trailing `.0`.
export function formatPercent(value: number): string {
  if (value > 0 && value < 0.1) return `<${percents().format(0.001)}`
  return value < 10 ? percents().format(Math.round(value * 10) / 1000) : wholePercents().format(Math.round(value) / 100)
}

const multiple = (value: number) => (value >= 10 ? String(Math.round(value)) : tenth().format(value))
// How often something runs: `×44`.
export const formatTimes = (value: number) => `×${multiple(value)}`
// How much larger something got: `2.2×`.
export const formatFactor = (value: number) => `${multiple(value)}×`
