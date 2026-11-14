import { ApiError, HttpStatus, NetworkError } from './client'

export const SignInField = { email: 'email', password: 'password', code: 'code' } as const
export type SignInField = (typeof SignInField)[keyof typeof SignInField]

export type SignInProblems = { fields: Partial<Record<SignInField, string>>; message?: string }

// allauth's error codes. Its sentences are never shown; each code we know has our own wording.
const Code = {
  required: 'required',
  invalid: 'invalid',
  mismatch: 'email_password_mismatch',
  tooMany: 'too_many_login_attempts',
  incorrectCode: 'incorrect_code',
} as const

const REQUIRED: Record<SignInField, string> = {
  email: 'Enter your email.',
  password: 'Enter your password.',
  code: 'Enter the code.',
}
const INVALID_EMAIL = 'Enter a valid email address.'
const WRONG_CODE = "That code isn't right. Check it, then try again."
const WRONG_PASSWORD = 'Wrong email or password.'
// The backend says how long to wait in neither the body nor a header, so no time is promised.
const TOO_MANY = 'Too many tries. Wait a few minutes, then try again.'
const UNREACHABLE = "Couldn't reach the server. Check your connection, then try again."
const FALLBACK = "Couldn't sign you in. Try again."

type AllauthError = { code?: string; param?: string; message?: string }

const errorsOf = (body: unknown): AllauthError[] => (body && typeof body === 'object' && 'errors' in body && Array.isArray(body.errors) ? body.errors : [])
const isField = (param: string | undefined): param is SignInField => param !== undefined && param in REQUIRED

function fieldText(code: string | undefined, field: SignInField): string | undefined {
  if (code === Code.required) return REQUIRED[field]
  if (code === Code.invalid && field === SignInField.email) return INVALID_EMAIL
  if (code === Code.incorrectCode && field === SignInField.code) return WRONG_CODE
  return undefined
}

// What the form can tell before asking the server.
export function checkSignIn({ email, password }: { email: string; password: string }): SignInProblems {
  const fields: SignInProblems['fields'] = {}
  if (!email.trim()) fields.email = REQUIRED.email
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) fields.email = INVALID_EMAIL
  if (!password) fields.password = REQUIRED.password
  return { fields }
}

export const checkCode = (code: string): SignInProblems => ({ fields: code.trim() ? {} : { code: REQUIRED.code } })

// Why signing in failed, in our words: under the field it concerns, or as one message for the form.
export function signInProblems(error: unknown): SignInProblems {
  if (error instanceof NetworkError) return { fields: {}, message: UNREACHABLE }
  if (!(error instanceof ApiError)) {
    console.error(error)
    return { fields: {}, message: FALLBACK }
  }
  if (error.status === HttpStatus.tooManyRequests) return { fields: {}, message: TOO_MANY }
  const problems: SignInProblems = { fields: {} }
  for (const { code, param, message } of errorsOf(error.body)) {
    const text = isField(param) ? fieldText(code, param) : undefined
    if (text && isField(param)) problems.fields[param] ??= text
    else if (code === Code.mismatch) problems.message ??= WRONG_PASSWORD
    else if (code === Code.tooMany) problems.message ??= TOO_MANY
    else console.error('Unmapped sign-in error', code, message)
  }
  if (!problems.message && Object.keys(problems.fields).length === 0) problems.message = FALLBACK
  return problems
}
