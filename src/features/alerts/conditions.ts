import type { Alert } from '@/api/alerts'

// A rule with no environments fires in every one; this is the word for that, in the list and in the editor.
export const ALL_ENVIRONMENTS = 'All'

// "10 events in 5 minutes", "a monitor goes down", or both.
export function conditions(alert: Pick<Alert, 'quantity' | 'timespanMinutes' | 'uptime'>): string[] {
  const parts: string[] = []
  if (alert.quantity && alert.timespanMinutes)
    parts.push(`${alert.quantity} ${alert.quantity === 1 ? 'event' : 'events'} in ${alert.timespanMinutes} ${alert.timespanMinutes === 1 ? 'minute' : 'minutes'}`)
  if (alert.uptime) parts.push('a monitor goes down')
  return parts
}
