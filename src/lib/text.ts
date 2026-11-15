import { messages } from '@/i18n'

// The words of a search box, for matching in any order and case.
export const searchWords = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean)

// Whether every word appears somewhere in the text.
export const hasWords = (text: string, words: string[]) => {
  const lower = text.toLowerCase()
  return words.every((word) => lower.includes(word))
}

// A release as people say it: a full commit hash (40 hex characters for SHA-1, 64 for SHA-256, with at least one
// letter so a long date or build number is left alone), alone or after `package@`, cut to its first seven like Git does.
export const releaseName = (version: string) => version.replace(/(^|@)(?=[0-9a-f]*[a-f])([0-9a-f]{7})(?:[0-9a-f]{33}|[0-9a-f]{57})$/i, '$1$2')

// A menu button's name: what it sets, then the value it shows ("Sort: Last seen"), so speech users can say the words they see.
export const valueName = (setting: string, value: string | undefined) => (value ? messages().common.valueName(setting, value) : setting)
