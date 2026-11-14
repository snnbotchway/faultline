import { type IssueEvent } from '@/api/issues'
import { Feature } from '@/api/organizations'
import { notify } from '@/lib/notice'

// Set once the hint has been shown. The stock interface uses the same key, so the hint is not shown twice.
export const MCP_HINT_KEY = 'mcpCopyHintSeen'

const MCP_GUIDE = 'https://glitchtip.com/documentation/mcp'

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
  const instance = window.location.origin
  // The event's own address: on the issue's first tab the page shows whichever event is newest.
  const eventUrl = `${instance}/${where.org}/issues/${where.issueId}/events/${event.id}`
  await navigator.clipboard.writeText(aiPayload(event, { ...where, instance, eventUrl }))
  if (!features?.includes(Feature.mcp) || localStorage.getItem(MCP_HINT_KEY) === 'true') {
    notify('Copied for AI')
    return
  }
  localStorage.setItem(MCP_HINT_KEY, 'true')
  notify('Copied. Skip the pasting with MCP.', false, {
    label: 'Set up MCP',
    run: () => void window.open(`${MCP_GUIDE}#instance=${encodeURIComponent(instance)}`, '_blank', 'noreferrer'),
  })
}
