import { type IssueEvent } from '@/api/issues'
import { Feature } from '@/api/organizations'
import { BASE_PATH } from '@/api/base'
import { messages } from '@/i18n'
import { notify } from '@/lib/notice'

// Set once the hint has been shown. The stock interface uses the same key, so the hint is not shown twice.
export const MCP_HINT_KEY = 'mcpCopyHintSeen'

const MCP_GUIDE = 'https://glitchtip.com/documentation/mcp'

// An issue's address as a person opens it, under the base Faultline is served from.
export const issueAddress = (origin: string, org: string, issueId: string, eventId?: string, base = BASE_PATH) =>
  `${origin}${base}/${org}/issues/${issueId}${eventId ? `/events/${eventId}` : ''}`

type Where = { instance: string; instanceName?: string | null; org: string; issueId: string; eventUrl: string }

export function aiPayload(event: IssueEvent, where: Where): string {
  return [
    'GlitchTip error event',
    `Source: ${where.instanceName || where.instance}`,
    `Instance: ${where.instance}`,
    `Organization: ${where.org}`,
    `Issue ID: ${where.issueId}`,
    `Event ID: ${event.id}`,
    `Event URL: ${where.eventUrl}`,
    '',
    'Raw event JSON:',
    '```json',
    JSON.stringify(event, null, 2),
    '```',
  ].join('\n')
}

// Copies the event, and says once that an agent can read events over MCP when the instance offers it.
export async function copyForAi(event: IssueEvent, where: Omit<Where, 'instance' | 'eventUrl'>, features: readonly string[] | undefined) {
  // GlitchTip runs under the same base, so that is where an agent finds its API and MCP.
  const instance = `${window.location.origin}${BASE_PATH}`
  // The event's own address: on the issue's first tab the page shows whichever event is newest.
  const eventUrl = issueAddress(window.location.origin, where.org, where.issueId, event.id)
  await navigator.clipboard.writeText(aiPayload(event, { ...where, instance, eventUrl }))
  if (!features?.includes(Feature.mcp) || localStorage.getItem(MCP_HINT_KEY) === 'true') {
    notify(messages().issues.notices.copiedForAi)
    return
  }
  localStorage.setItem(MCP_HINT_KEY, 'true')
  notify(messages().issues.notices.copiedMcp, false, {
    label: messages().issues.notices.setUpMcp,
    run: () => void window.open(`${MCP_GUIDE}#instance=${encodeURIComponent(instance)}`, '_blank', 'noreferrer'),
  })
}
