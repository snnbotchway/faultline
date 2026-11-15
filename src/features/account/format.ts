import { localized } from '@/i18n'

const dayFormat = localized((tag) => new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' }))

// A date for a row. The sign-in backend counts in seconds, the rest of the API writes ISO strings.
export const day = (time: string | number) => dayFormat().format(new Date(typeof time === 'number' ? time * 1000 : time))

// A provider's display name, as the server's settings give it; its id when the provider is no longer set up.
export const providerName = (apps: { provider: string; name: string }[], provider: string) => apps.find((app) => app.provider === provider)?.name ?? provider
