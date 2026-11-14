import { ApiError, HttpStatus } from './client'
import { explain } from './errors'

// What went wrong with a form: errors under the fields it shows, anything else as one message.
export type FormProblems = { fields: Record<string, string>; message?: string }

// allauth's error codes. Its sentences are never shown; each code we know has our own wording.
const CODE_TEXT: Record<string, string> = {
  required: 'Fill this in.',
  password_too_short: 'Use 8 or more characters.',
  password_too_common: 'That password is too easy to guess. Pick another.',
  password_entirely_numeric: 'Add a letter or a symbol.',
  password_too_similar: 'Pick a password less like your email.',
  email_taken: 'That email already has an account. Sign in instead.',
  enter_current_password: "That isn't your current password.",
  incorrect_code: "That code isn't right. Check it, then try again.",
  invalid_password_reset: 'That link has expired or was already used. Ask for a new one.',
  invalid_or_expired_key: 'That link has expired or was already used.',
  unverified_email: 'Verify every email on your account first, or remove the ones you no longer use.',
}
// allauth's `invalid` means something different for each field.
const INVALID_TEXT: Record<string, string> = { email: 'Enter a valid email address.', code: "That code isn't right. Check it, then try again." }

// GlitchTip's `detail` strings for account changes, in the user's words.
const DETAIL_TEXT: Record<string, string> = {
  'Invalid code': "That code isn't one of the new ones. Check it, then try again.",
  'Token not found': 'That link has expired. Run the wizard again for a new one.',
  'Email already exists': 'That email is already on an account.',
  'User is organization owner. Delete organization or transfer ownership first.': 'You own an organization. Transfer it or delete it first.',
}

const TOO_MANY = 'Too many tries. Wait a few minutes, then try again.'

type AllauthError = { code?: string; param?: string }
type InvalidInput = { type?: string; loc?: unknown[]; ctx?: { max_length?: number } }

const listOf = <T>(body: unknown, key: string): T[] => {
  const value = body && typeof body === 'object' && key in body ? (body as Record<string, unknown>)[key] : undefined
  return Array.isArray(value) ? value : []
}

// django-ninja's 422s name the field last in `loc`; its `msg` is for developers.
function inputText({ type, loc, ctx }: InvalidInput): [string | undefined, string | undefined] {
  const field = typeof loc?.at(-1) === 'string' ? (loc.at(-1) as string) : undefined
  if (type === 'string_too_long' && ctx?.max_length) return [field, `Use ${ctx.max_length} characters or fewer.`]
  if (type === 'missing') return [field, CODE_TEXT.required]
  if (field === 'email') return [field, INVALID_TEXT.email]
  return [field, undefined]
}

/**
 * Why `action` ("change your password") failed, in our words. A problem goes under a field only when the form
 * shows that field (`shown`); otherwise it becomes the form's message. Raw backend text goes to the console.
 */
export function formProblems(error: unknown, action: string, shown: readonly string[] = []): FormProblems {
  if (!(error instanceof ApiError) || error.status === HttpStatus.tooManyRequests)
    return { fields: {}, message: error instanceof ApiError ? TOO_MANY : explain(error, action) }
  const problems: FormProblems = { fields: {} }
  const place = (field: string | undefined, text: string) => {
    if (field && shown.includes(field)) problems.fields[field] ??= text
    else problems.message ??= text
  }
  const found: [string | undefined, string | undefined][] = [
    ...listOf<AllauthError>(error.body, 'errors').map(({ code, param }): [string | undefined, string | undefined] => [
      param,
      (code === 'invalid' && param ? INVALID_TEXT[param] : undefined) ?? CODE_TEXT[code ?? ''],
    ]),
    ...listOf<InvalidInput>(error.body, 'detail').map(inputText),
  ]
  for (const [field, text] of found) if (text) place(field, text)
  if (Object.keys(problems.fields).length > 0 || problems.message) {
    if (found.some(([, text]) => !text)) console.error('Unmapped form error', error.body)
    return problems
  }
  const detail = error.body && typeof error.body === 'object' && 'detail' in error.body ? error.body.detail : undefined
  if (typeof detail === 'string' && DETAIL_TEXT[detail]) {
    console.error(detail)
    return { fields: {}, message: DETAIL_TEXT[detail] }
  }
  return { fields: {}, message: explain(error, action) }
}

const EXPIRED_LINK = new Set(['invalid_password_reset', 'invalid_or_expired_key'])

// An emailed link (password reset, email verification) that has expired or was already used.
export const isExpiredLink = (error: unknown) =>
  error instanceof ApiError && listOf<AllauthError>(error.body, 'errors').some(({ code }) => EXPIRED_LINK.has(code ?? ''))
