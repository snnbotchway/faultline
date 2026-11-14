// A duration in the unit a person would say it in: `4.2 ms`, `173 ms`, `7.46 s`, `2m 54s`.
export function formatMs(value: number): string {
  if (value < 10) return `${trim(value.toFixed(1))} ms`
  if (value < 1000) return `${Math.round(value)} ms`
  if (value < 60_000) return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)} s`
  const minutes = Math.floor(value / 60_000)
  return minutes < 60 ? `${minutes}m ${Math.floor((value % 60_000) / 1000)}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

const trim = (text: string) => text.replace(/\.0$/, '')

// One decimal below ten, none above, and never a trailing `.0`.
export function formatPercent(value: number): string {
  if (value > 0 && value < 0.1) return '<0.1%'
  return `${value < 10 ? trim(value.toFixed(1)) : Math.round(value)}%`
}

export const formatTimes = (value: number) => `×${value >= 10 ? Math.round(value) : trim(value.toFixed(1))}`
