import { RELEASES_SCOPE, TOKEN_LEVELS, TOKEN_RESOURCES, TokenResource } from '@/api/account'
import { messages } from '@/i18n'

/** `project:read project:write project:releases` in the form's own words: "Projects: Read, Write · Releases". */
export function scopeWords(scopes: string[]): string {
  const text = messages().account.tokens
  const known = new Set(scopes)
  const parts: string[] = []
  for (const resource of TOKEN_RESOURCES) {
    const levels = TOKEN_LEVELS.filter((level) => known.delete(`${resource}:${level}`)).map((level) => text.levels[level])
    if (levels.length) parts.push(messages().common.valueName(text.resources[resource], levels.join(', ')))
    if (resource === TokenResource.project && known.delete(RELEASES_SCOPE)) parts.push(text.releases)
  }
  // A scope this version does not know is shown as the backend names it, rather than hidden.
  return [...parts, ...known].join(' · ')
}
