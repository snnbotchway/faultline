import { formText, type FormProblems } from '@/api/form-errors'

const controls = (form: HTMLFormElement) =>
  [...form.elements].filter((element): element is HTMLInputElement | HTMLTextAreaElement => element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)

// The names of the fields a form shows, in their order on screen.
export const fieldNames = (form: HTMLFormElement) => controls(form).flatMap((control) => (control.name ? [control.name] : []))

/**
 * What a form can tell before asking the server, from its fields' own rules (`required`, `type="email"`,
 * `minLength`, `maxLength`). Forms are `noValidate`, so these replace the browser's bubbles.
 */
export function checkForm(form: HTMLFormElement): FormProblems {
  const fields: FormProblems['fields'] = {}
  const text = formText()
  for (const control of controls(form)) {
    const { name, minLength, maxLength } = control
    // The backend strips every field, passwords included, before it checks them, so the form counts the same way.
    const value = control.value.trim()
    if (!name || fields[name]) continue
    if (!value) {
      if (control.required) fields[name] = text.required
    } else if (control.type === 'email' && control.validity.typeMismatch) fields[name] = text.invalidEmail
    // The browser only flags lengths the user typed, and counts the spaces the backend strips.
    else if (minLength > 0 && value.length < minLength) fields[name] = text.tooShort(minLength)
    else if (maxLength > 0 && value.length > maxLength) fields[name] = text.tooLong(maxLength)
  }
  return { fields }
}

export const hasProblems = (problems: FormProblems) => !!problems.message || Object.keys(problems.fields).length > 0

// The controls a problem can point at, in screen order: named fields, and any control marked `data-field`
// for a problem about a group (the first checkbox of a set).
const targets = (form: HTMLFormElement) =>
  [...form.querySelectorAll<HTMLElement>('input[name]:not([type=hidden]):not([aria-hidden=true]), textarea[name], [data-field]')].map((element) => ({
    element,
    field: element.dataset.field ?? element.getAttribute('name') ?? '',
  }))

// Moves focus to the first control, in screen order, that has a problem.
export function focusFirstProblem(form: HTMLFormElement | null, problems: FormProblems) {
  if (!form) return
  targets(form)
    .find(({ field }) => problems.fields[field])
    ?.element.focus()
}
