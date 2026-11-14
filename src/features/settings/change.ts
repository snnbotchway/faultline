import { useQueryClient, type QueryFilters } from '@tanstack/react-query'
import { useState } from 'react'
import { explain } from '@/api/errors'
import { failed } from '@/lib/notice'

type ChangeOptions<Input, Result> = {
  // What the change makes out of date; fetched again before `onDone` runs.
  stale: readonly QueryFilters[]
  // A failure is said in a notice, for a control with no form to show it under; otherwise it comes back as `error`.
  notice?: boolean
  onDone?: (result: Result, input: Input) => void
  // For a change that removes the page it was made on: `onDone` runs first, as fetching the removed thing again would only fail.
  leavesPage?: boolean
}

/**
 * One change to settings. `what` completes "Couldn't …". A failure in a form is returned as `error` for the form to
 * show under its fields.
 */
export function useChange<Input = void, Result = unknown>(what: string, change: (input: Input) => Promise<Result>, options: ChangeOptions<Input, Result>) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  async function run(input: Input) {
    setPending(true)
    setError(undefined)
    try {
      const result = await change(input)
      const refresh = () => Promise.all(options.stale.map((filters) => queryClient.invalidateQueries(filters)))
      if (options.leavesPage) {
        options.onDone?.(result, input)
        void refresh()
      } else {
        await refresh()
        options.onDone?.(result, input)
      }
    } catch (caught) {
      if (options.notice) failed(caught, what)
      else setError(explain(caught, what))
    } finally {
      setPending(false)
    }
  }
  return { run: (input: Input) => void run(input), pending, error, clear: () => setError(undefined) }
}
