import type { ReactNode } from 'react'
import { count, plural, type PluralForms } from './format'

/**
 * `plural()` with the figure set apart, for a count shown in mono beside a word in the sans: every form leads with
 * `#`, which is swapped for `figure`. A count already worded (`1000+`) has no leading figure and is shown as it is.
 */
export function counted(value: number | string, forms: PluralForms, figure: ReactNode): ReactNode {
  const text = plural(value, forms)
  const lead = typeof value === 'string' ? value : count(value)
  return text.startsWith(lead) ? (
    <>
      {figure}
      {text.slice(lead.length)}
    </>
  ) : (
    text
  )
}
