import type { Alert } from '@/api/alerts'
import { plural } from '@/lib/text'

// "10 events in 5 minutes", "a monitor goes down", or both.
export function conditions(alert: Pick<Alert, 'quantity' | 'timespanMinutes' | 'uptime'>): string[] {
  const parts: string[] = []
  if (alert.quantity && alert.timespanMinutes)
    parts.push(`${plural(alert.quantity, 'event')} in ${plural(alert.timespanMinutes, 'minute')}`)
  if (alert.uptime) parts.push('a monitor goes down')
  return parts
}
