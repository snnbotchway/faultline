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

// Where a recipient sends, shown as its host only: a webhook's path often holds its secret token.
export function recipientHost(recipient: { recipientType: string; url?: string | null }): string {
  if (recipient.recipientType === RecipientType.email) return 'project members'
  try {
    return new URL(recipient.url ?? '').host.replace(/^www\./, '')
  } catch {
    return ''
  }
}


export const isAddress = (url: string) => {
  try {
    return Boolean(new URL(withScheme(url)).hostname.includes('.'))
  } catch {
    return false
  }
}

