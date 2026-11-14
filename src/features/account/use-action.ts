import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { formProblems, type FormProblems } from '@/api/form-errors'
import { checkForm, fieldNames, focusFirstProblem, hasProblems } from '@/lib/form-check'

/**
 * One change to the account: sends it, refreshes what it changed, and keeps what went wrong.
 * `action` completes "Couldn't …". From a form (`submit`), problems go under the fields it shows and focus moves
 * to the first; anything else, and every problem from a plain button (`run`), lands in `error`.
 */
export function useAction<Input = void>(request: (input: Input) => Promise<unknown>, { action, refresh = [], onDone }: { action: string; refresh?: QueryKey[]; onDone?: () => void }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [problems, setProblems] = useState<FormProblems>({ fields: {} })

  function show(form: HTMLFormElement | null, found: FormProblems) {
    setProblems(found)
    focusFirstProblem(form, found)
  }

  async function send(input: Input, form: HTMLFormElement | null) {
    setBusy(true)
    show(form, { fields: {} })
    try {
      await request(input)
      await Promise.all(refresh.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      onDone?.()
      return true
    } catch (failure) {
      show(form, formProblems(failure, action, form ? fieldNames(form) : []))
      return false
    } finally {
      setBusy(false)
    }
  }

  // `found` is anything the form caught on its own, beyond its fields' rules.
  async function submit(event: FormEvent<HTMLFormElement>, input: Input, found: FormProblems = { fields: {} }) {
    event.preventDefault()
    const form = event.currentTarget
    const checked = checkForm(form)
    const caught = { fields: { ...found.fields, ...checked.fields }, message: found.message }
    if (!hasProblems(caught)) return send(input, form)
    show(form, caught)
    return false
  }

  return {
    run: (input: Input) => send(input, null),
    submit,
    busy,
    error: problems.message ?? '',
    fields: problems.fields,
    clear: () => setProblems({ fields: {} }),
  }
}
