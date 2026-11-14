import { ApiError, HttpStatus } from './client'
import { explain } from './errors'

// What went wrong with a form: errors under the fields it shows, anything else as one message.
export type FormProblems = { fields: Record<string, string>; message?: string }

// allauth's error codes that Faultline words. Its own sentences are never shown.
export const AllauthCode = {
  required: 'required',
  invalid: 'invalid',
  emailPasswordMismatch: 'email_password_mismatch',
  tooManyLoginAttempts: 'too_many_login_attempts',
  incorrectCode: 'incorrect_code',
  passwordTooShort: 'password_too_short',
  passwordTooCommon: 'password_too_common',
  passwordEntirelyNumeric: 'password_entirely_numeric',
  passwordTooSimilar: 'password_too_similar',
  emailTaken: 'email_taken',
  enterCurrentPassword: 'enter_current_password',
  invalidPasswordReset: 'invalid_password_reset',
  invalidOrExpiredKey: 'invalid_or_expired_key',
  unverifiedEmail: 'unverified_email',
  noPassword: 'no_password',
  noVerifiedEmail: 'no_verified_email',
  disconnectLast: 'disconnect_last',
  accountNotFound: 'account_not_found',
} as const
export type AllauthCode = (typeof AllauthCode)[keyof typeof AllauthCode]

// One wording for what a form catches itself and what the server catches.
export const FormText = {
  required: 'Fill this in.',
  invalidEmail: 'Enter a valid email address.',
  tooShort: (length: number) => `Use ${length} or more characters.`,
  tooLong: (length: number) => `Use ${length} characters or fewer.`,
  // The backend says how long to wait in neither the body nor a header, so no time is promised.
  tooMany: 'Too many tries. Wait a few minutes, then try again.',
} as const

const WRONG_CODE = "That code isn't right. Check it, then try again."

// `invalid` means something different for each field, so it is worded by INVALID_TEXT instead.
const CODE_TEXT: Record<Exclude<AllauthCode, typeof AllauthCode.invalid>, string> = {
  required: FormText.required,
  email_password_mismatch: 'Wrong email or password.',
  too_many_login_attempts: FormText.tooMany,
  incorrect_code: WRONG_CODE,
  password_too_short: FormText.tooShort(8),
  password_too_common: 'That password is too easy to guess. Pick another.',
  password_entirely_numeric: 'Add a letter or a symbol.',
  password_too_similar: 'Pick a password less like your email.',
  email_taken: 'That email already has an account. Sign in instead.',
  enter_current_password: "That isn't your current password.",
  invalid_password_reset: 'That link has expired or was already used. Ask for a new one.',
  invalid_or_expired_key: 'That link has expired or was already used.',
  unverified_email: 'Verify every email on your account first, or remove the ones you no longer use.',
  no_password: 'Set a password before you disconnect this account.',
  no_verified_email: 'Verify an email before you disconnect this account.',
  disconnect_last: 'This is your only way to sign in. Set a password before you disconnect it.',
  account_not_found: 'That account is already disconnected.',
}
const INVALID_TEXT: Record<string, string> = { email: FormText.invalidEmail, code: WRONG_CODE }

// Codes about the whole attempt: the form's message, even though allauth names a field.
const FORM_LEVEL = new Set<string>([AllauthCode.emailPasswordMismatch, AllauthCode.tooManyLoginAttempts, AllauthCode.unverifiedEmail])

// GlitchTip's `detail` strings for account changes, in the user's words.
const DETAIL_TEXT: Record<string, string> = {
  'Invalid code': "That code isn't one of the new ones. Check it, then try again.",
  'Token not found': 'That link has expired. Run the wizard again for a new one.',
  'Email already exists': 'That email is already on an account.',
  'User is organization owner. Delete organization or transfer ownership first.': 'You own an organization. Transfer it or delete it first.',
}

type AllauthError = { code?: string; param?: string }
type InvalidInput = { type?: string; loc?: unknown[]; ctx?: { max_length?: number } }
type Found = { field?: string; text?: string }

const listOf = <T>(body: unknown, key: string): T[] => {
  const value = body && typeof body === 'object' && key in body ? (body as Record<string, unknown>)[key] : undefined
  return Array.isArray(value) ? value : []
}

function allauthText({ code = '', param }: AllauthError): Found {
  const text = code === AllauthCode.invalid ? INVALID_TEXT[param ?? ''] : CODE_TEXT[code as keyof typeof CODE_TEXT]
  return { field: FORM_LEVEL.has(code) ? undefined : param, text }
}

// django-ninja's 422s name the field last in `loc`; its `msg` is for developers.
function inputText({ type, loc, ctx }: InvalidInput): Found {
  const last = loc?.at(-1)
  const field = typeof last === 'string' ? last : undefined
  if (type === 'string_too_long' && ctx?.max_length) return { field, text: FormText.tooLong(ctx.max_length) }
  if (type === 'missing') return { field, text: FormText.required }
  if (field === 'email') return { field, text: FormText.invalidEmail }
  return { field }
}

/**
 * Why `action` ("change your password") failed, in our words. A problem goes under a field only when the form
 * shows that field (`shown`); otherwise it becomes the form's message. Raw backend text goes to the console.
 */
export function formProblems(error: unknown, action: string, shown: readonly string[] = []): FormProblems {
  if (!(error instanceof ApiError)) return { fields: {}, message: explain(error, action) }
  if (error.status === HttpStatus.tooManyRequests) return { fields: {}, message: FormText.tooMany }
  const problems: FormProblems = { fields: {} }
  const found = [...listOf<AllauthError>(error.body, 'errors').map(allauthText), ...listOf<InvalidInput>(error.body, 'detail').map(inputText)]
  for (const { field, text } of found) {
    if (!text) continue
    if (field && shown.includes(field)) problems.fields[field] ??= text
    else problems.message ??= text
  }
  if (Object.keys(problems.fields).length > 0 || problems.message) {
    if (found.some(({ text }) => !text)) console.error('Unmapped form error', error.body)
    return problems
  }
  const detail = error.body && typeof error.body === 'object' && 'detail' in error.body ? error.body.detail : undefined
  if (typeof detail === 'string' && DETAIL_TEXT[detail]) {
    console.error(detail)
    return { fields: {}, message: DETAIL_TEXT[detail] }
  }
  return { fields: {}, message: explain(error, action) }
}

const EXPIRED_LINK = new Set<string>([AllauthCode.invalidPasswordReset, AllauthCode.invalidOrExpiredKey])

// An emailed link (password reset, email verification) that has expired or was already used.
export const isExpiredLink = (error: unknown) =>
  error instanceof ApiError && listOf<AllauthError>(error.body, 'errors').some(({ code }) => EXPIRED_LINK.has(code ?? ''))
