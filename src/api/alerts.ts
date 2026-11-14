import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from './client'
import { MAX_PAGE_SIZE, fetchAllPages } from './pagination'
import type { components } from './schema/openapi'

type Schemas = components['schemas']
export type Alert = Schemas['ProjectAlertSchema']
export type AlertInput = Schemas['ProjectAlertIn']
export type Recipient = Schemas['AlertRecipientSchema']
export type RecipientInput = NonNullable<AlertInput['alertRecipients']>[number]

export const RecipientType = {
  email: 'email',
  webhook: 'webhook',
  slack: 'slack',
  discord: 'discord',
  teams: 'teams',
  googlechat: 'googlechat',
  ntfy: 'ntfy',
  feishu: 'feishu',
  zulip: 'zulip',
} as const
export type RecipientType = (typeof RecipientType)[keyof typeof RecipientType]

// What the backend says happened to each recipient of a test alert.
export const TestStatus = { sent: 'sent', skipped: 'skipped', error: 'error' } as const
export type TestStatus = (typeof TestStatus)[keyof typeof TestStatus]
export type TestResult = Schemas['TestAlertResultSchema']

// A Zulip recipient's settings come back in `config` with snake_case keys and go in as fields of their own.
type ZulipConfig = { bot_email?: string; api_key?: string; channel?: string; topic?: string }
export const ZULIP_TOPIC = 'GlitchTip Alerts'

// A recipient as read, in the shape a rule is saved with. Its extra tags go back unchanged.
export function toRecipientInput(recipient: Recipient): RecipientInput {
  const url = recipient.url ?? ''
  const tagsToAdd = (recipient.tagsToAdd ?? []) as string[]
  if (recipient.recipientType === RecipientType.email) return { recipientType: RecipientType.email, url: '', tagsToAdd }
  if (recipient.recipientType === RecipientType.zulip) {
    const config = (recipient.config ?? {}) as ZulipConfig
    return { recipientType: RecipientType.zulip, url, botEmail: config.bot_email ?? '', apiKey: config.api_key ?? '', channel: config.channel ?? '', topic: config.topic ?? ZULIP_TOPIC, tagsToAdd }
  }
  return { recipientType: recipient.recipientType as Exclude<RecipientType, 'email' | 'zulip'>, url, tagsToAdd }
}

export const alertKeys = {
  all: (slug: string) => ['alerts', slug] as const,
  project: (slug: string, project: string) => [...alertKeys.all(slug), project] as const,
}

const projectPath = (slug: string, project: string) => ({ organization_id_or_slug: slug, project_slug: project })
const alertPath = (slug: string, project: string, id: number) => ({ ...projectPath(slug, project), alert_id: id })

export const projectAlertsQuery = (slug: string, project: string) =>
  queryOptions({
    queryKey: alertKeys.project(slug, project),
    queryFn: () =>
      fetchAllPages((cursor) =>
        api.GET('/api/0/projects/{organization_id_or_slug}/{project_slug}/alerts/', {
          params: { path: projectPath(slug, project), query: { cursor, limit: MAX_PAGE_SIZE } },
        }),
      ),
  })

export const alertActions = {
  create: async (slug: string, project: string, body: AlertInput) =>
    unwrap(await api.POST('/api/0/projects/{organization_id_or_slug}/{project_slug}/alerts/', { params: { path: projectPath(slug, project) }, body })),
  update: async (slug: string, project: string, id: number, body: AlertInput) =>
    unwrap(
      await api.PUT('/api/0/projects/{organization_id_or_slug}/{project_slug}/alerts/{alert_id}/', { params: { path: alertPath(slug, project, id) }, body }),
    ),
  remove: async (slug: string, project: string, id: number) =>
    unwrap(await api.DELETE('/api/0/projects/{organization_id_or_slug}/{project_slug}/alerts/{alert_id}/', { params: { path: alertPath(slug, project, id) } })),
  // Sends a sample alert to every recipient of the saved rule. Email recipients are skipped.
  test: async (slug: string, project: string, id: number) =>
    unwrap(await api.POST('/api/0/projects/{organization_id_or_slug}/{project_slug}/alerts/{alert_id}/test/', { params: { path: alertPath(slug, project, id) } })),
}
