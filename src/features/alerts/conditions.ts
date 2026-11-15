import type { Alert } from '@/api/alerts'
import { messages } from '@/i18n'

// "10 events in 5 minutes", "a monitor goes down", or both.
export function conditions(alert: Pick<Alert, 'quantity' | 'timespanMinutes' | 'uptime'>): string[] {
  const t = messages().alerts
  const parts: string[] = []
  if (alert.quantity && alert.timespanMinutes) parts.push(t.events(alert.quantity, alert.timespanMinutes))
  if (alert.uptime) parts.push(t.monitorDown)
  return parts
}
