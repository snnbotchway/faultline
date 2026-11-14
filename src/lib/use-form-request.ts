import { useState, type FormEvent } from 'react'
import { formProblems, type FormProblems } from '@/api/form-errors'
import { checkForm, fieldNames, focusFirstProblem, hasProblems } from './form-check'

const NONE: FormProblems = { fields: {} }

/**
 * Sends one request for a form and keeps what went wrong. `action` completes "Couldn't …". From a form (`submit`)
 * its fields are checked first, problems go under the fields it shows and focus moves to the first; anything
 * else, and every problem from a plain button (`send` with no form), becomes `message`.
 * Resolves to `{ value }` when the request succeeded.
 */
export function useFormRequest(action: string) {
  const [busy, setBusy] = useState(false)
  const [problems, setProblems] = useState<FormProblems>(NONE)

  function show(form: HTMLFormElement | null, found: FormProblems) {
    setProblems(found)
    focusFirstProblem(form, found)
  }

  async function send<T>(request: () => Promise<T>, form: HTMLFormElement | null = null): Promise<{ value: T } | undefined> {
    setBusy(true)
    show(form, NONE)
    try {
      return { value: await request() }
    } catch (error) {
      show(form, formProblems(error, action, form ? fieldNames(form) : []))
      return undefined
    } finally {
      setBusy(false)
    }
  }

  // `found` is anything the form caught on its own, beyond its fields' rules.
  async function submit<T>(event: FormEvent<HTMLFormElement>, request: () => Promise<T>, found: FormProblems = NONE) {
    event.preventDefault()
    const form = event.currentTarget
    const caught = { fields: { ...found.fields, ...checkForm(form).fields }, message: found.message }
    if (!hasProblems(caught)) return send(request, form)
    show(form, caught)
    return undefined
  }

  return { busy, problems, send, submit, clear: () => setProblems(NONE) }
}
