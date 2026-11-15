import { messages, type Messages } from '@/i18n'
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

type FormText = Messages['common']['form']
// The words of a form's problems (`required`, `tooShort`, …), in the language on screen.
export const formText = (): FormText => messages().common.form

// The backend says how long to wait in neither the body nor a header, so `tooMany` promises no time.
// `invalid` means something different for each field, so it is worded by INVALID_TEXT instead.
const CODE_TEXT: Record<Exclude<AllauthCode, typeof AllauthCode.invalid>, (text: FormText) => string> = {
  required: (text) => text.required,
  email_password_mismatch: (text) => text.emailPasswordMismatch,
  too_many_login_attempts: (text) => text.tooMany,
  incorrect_code: (text) => text.wrongCode,
  password_too_short: (text) => text.tooShort(8),
  password_too_common: (text) => text.passwordTooCommon,
  password_entirely_numeric: (text) => text.passwordNumeric,
  password_too_similar: (text) => text.passwordSimilar,
  email_taken: (text) => text.emailTaken,
  enter_current_password: (text) => text.notCurrentPassword,
  invalid_password_reset: (text) => text.resetLinkExpired,
  invalid_or_expired_key: (text) => text.linkExpired,
  unverified_email: (text) => text.unverifiedEmail,
  no_password: (text) => text.noPassword,
  no_verified_email: (text) => text.noVerifiedEmail,
  disconnect_last: (text) => text.disconnectLast,
  account_not_found: (text) => text.accountGone,
}
const INVALID_TEXT: Record<string, (text: FormText) => string> = { email: (text) => text.invalidEmail, code: (text) => text.wrongCode }

// Codes about the whole attempt: the form's message, even though allauth names a field.
const FORM_LEVEL = new Set<string>([AllauthCode.emailPasswordMismatch, AllauthCode.tooManyLoginAttempts, AllauthCode.unverifiedEmail])

// GlitchTip's `detail` strings for account changes, in the user's words.
// The plain sentences of FormText, as against the ones that take a length.
type Sentence = { [K in keyof FormText]: FormText[K] extends string ? K : never }[keyof FormText]

const DETAIL_TEXT: Record<string, Sentence> = {
  'Invalid code': 'invalidCode',
  'Token not found': 'wizardExpired',
  'Email already exists': 'emailExists',
  'User is organization owner. Delete organization or transfer ownership first.': 'ownsOrganization',
  'User is the only member of an organization. Delete the organization or add another member first.': 'onlyMember',
}

type AllauthError = { code?: string; param?: string }

// allauth asks a signed-in user to prove it is them again: a 401 that still says the session is signed in.
const needsReauthentication = (error: ApiError) =>
  error.status === HttpStatus.unauthenticated &&
  !!error.body &&
  typeof error.body === 'object' &&
  'meta' in error.body &&
  (error.body as { meta?: { is_authenticated?: boolean } }).meta?.is_authenticated === true
type InvalidInput = { type?: string; loc?: unknown[]; ctx?: { max_length?: number } }
type Found = { field?: string; text?: string }

const listOf = <T>(body: unknown, key: string): T[] => {
  const value = body && typeof body === 'object' && key in body ? (body as Record<string, unknown>)[key] : undefined
  return Array.isArray(value) ? value : []
}

function allauthText({ code = '', param }: AllauthError): Found {
  const word = code === AllauthCode.invalid ? INVALID_TEXT[param ?? ''] : CODE_TEXT[code as keyof typeof CODE_TEXT]
  return { field: FORM_LEVEL.has(code) ? undefined : param, text: word?.(formText()) }
}

// django-ninja's 422s name the field last in `loc`; its `msg` is for developers.
function inputText({ type, loc, ctx }: InvalidInput): Found {
  const last = loc?.at(-1)
  const field = typeof last === 'string' ? last : undefined
  const text = formText()
  if (type === 'string_too_long' && ctx?.max_length) return { field, text: text.tooLong(ctx.max_length) }
  if (type === 'missing') return { field, text: text.required }
  if (field === 'email') return { field, text: text.invalidEmail }
  return { field }
}

/**
 * Why `action` ("change your password") failed, in our words. A problem goes under a field only when the form
 * shows that field (`shown`); otherwise it becomes the form's message. Raw backend text goes to the console.
 */
export function formProblems(error: unknown, action: string, shown: readonly string[] = []): FormProblems {
  if (!(error instanceof ApiError)) return { fields: {}, message: explain(error, action) }
  if (error.status === HttpStatus.tooManyRequests) return { fields: {}, message: formText().tooMany }
  if (needsReauthentication(error)) return { fields: {}, message: formText().reauthenticate }
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
  const known = typeof detail === 'string' ? DETAIL_TEXT[detail] : undefined
  if (known) {
    console.error(detail)
    return { fields: {}, message: formText()[known] }
  }
  return { fields: {}, message: explain(error, action) }
}

const EXPIRED_LINK = new Set<string>([AllauthCode.invalidPasswordReset, AllauthCode.invalidOrExpiredKey])

// An emailed link (password reset, email verification) that has expired or was already used.
export const isExpiredLink = (error: unknown) =>
  error instanceof ApiError && listOf<AllauthError>(error.body, 'errors').some(({ code }) => EXPIRED_LINK.has(code ?? ''))
