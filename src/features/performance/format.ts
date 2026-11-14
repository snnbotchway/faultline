const trim = (text: string) => text.replace(/\.0$/, '')

// A duration in the unit a person would say it in: `4.2 ms`, `173 ms`, `7.46 s`, `2m 54s`. Each unit
// stops where its rounding would reach the next, so 59.99 s reads `1m 0s`, not `60.0 s`.
export function formatMs(value: number): string {
  if (value < 9.95) return `${trim(value.toFixed(1))} ms`
  if (value < 999.5) return `${Math.round(value)} ms`
  if (value < 9_995) return `${(value / 1000).toFixed(2)} s`
  if (value < 59_950) return `${(value / 1000).toFixed(1)} s`
  const seconds = Math.round(value / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const minutes = Math.round(value / 60_000)
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

// One decimal below ten, none above, and never a trailing `.0`.
export function formatPercent(value: number): string {
  if (value > 0 && value < 0.1) return '<0.1%'
  return `${value < 10 ? trim(value.toFixed(1)) : Math.round(value)}%`
}

const multiple = (value: number) => (value >= 10 ? String(Math.round(value)) : trim(value.toFixed(1)))
// How often something runs: `×44`.
export const formatTimes = (value: number) => `×${multiple(value)}`
// How much larger something got: `2.2×`.
export const formatFactor = (value: number) => `${multiple(value)}×`
