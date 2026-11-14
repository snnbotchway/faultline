import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import type { FormProblems } from '@/api/form-errors'
import { useFormRequest } from '@/lib/use-form-request'

/**
 * One change to the account: sends it, refreshes exactly the queries it changed, and keeps what went wrong.
 * `action` completes "Couldn't …". `submit` is for a form, `run` for a plain button.
 */
export function useAction<Input = void>(request: (input: Input) => Promise<unknown>, { action, refresh = [], onDone }: { action: string; refresh?: QueryKey[]; onDone?: () => void }) {
  const queryClient = useQueryClient()
  const form = useFormRequest(action)

  async function change(input: Input) {
    await request(input)
    // Exact: the user's own key is the prefix of every other account key.
    await Promise.all(refresh.map((queryKey) => queryClient.invalidateQueries({ queryKey, exact: true })))
    onDone?.()
  }

  return {
    run: async (input: Input) => !!(await form.send(() => change(input))),
    submit: async (event: FormEvent<HTMLFormElement>, input: Input, found?: FormProblems) => !!(await form.submit(event, () => change(input), found)),
    busy: form.busy,
    message: form.problems.message,
    fields: form.problems.fields,
    clear: form.clear,
  }
}
