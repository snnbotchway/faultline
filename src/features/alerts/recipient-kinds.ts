import { BellRing, Mail, MessagesSquare, Webhook, type LucideIcon } from 'lucide-react'
import { RecipientType } from '@/api/alerts'
import { withScheme } from '@/lib/url'

export const RECIPIENTS: Record<RecipientType, { label: string; icon: LucideIcon; placeholder: string }> = {
  [RecipientType.email]: { label: 'Email', icon: Mail, placeholder: '' },
  [RecipientType.webhook]: { label: 'Webhook', icon: Webhook, placeholder: 'https://example.com/hooks/alerts' },
  [RecipientType.slack]: { label: 'Slack', icon: MessagesSquare, placeholder: 'https://hooks.slack.com/services/…' },
  [RecipientType.discord]: { label: 'Discord', icon: MessagesSquare, placeholder: 'https://discord.com/api/webhooks/…' },
  [RecipientType.teams]: { label: 'Teams', icon: MessagesSquare, placeholder: 'https://…webhook.office.com/…' },
  [RecipientType.googlechat]: { label: 'Google Chat', icon: MessagesSquare, placeholder: 'https://chat.googleapis.com/v1/spaces/…' },
  [RecipientType.ntfy]: { label: 'ntfy', icon: BellRing, placeholder: 'https://ntfy.sh/your-topic' },
  [RecipientType.feishu]: { label: 'Feishu', icon: MessagesSquare, placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/…' },
  [RecipientType.zulip]: { label: 'Zulip', icon: MessagesSquare, placeholder: 'https://example.zulipchat.com' },
}

export const recipientMeta = (recipient: { recipientType: string }) => RECIPIENTS[recipient.recipientType as RecipientType] ?? RECIPIENTS.webhook

// The part of an address that tells two apart: the host and the last path segment.
export function recipientTarget(recipient: { recipientType: string; url?: string | null }): { host: string; tail?: string } {
  if (recipient.recipientType === RecipientType.email) return { host: 'project members' }
  try {
    const url = new URL(recipient.url ?? '')
    const last = url.pathname.split('/').filter(Boolean).at(-1)
    return { host: url.host.replace(/^www\./, ''), tail: last }
  } catch {
    return { host: recipient.url ?? '' }
  }
}


export const isAddress = (url: string) => {
  try {
    return Boolean(new URL(withScheme(url)).hostname.includes('.'))
  } catch {
    return false
  }
}

