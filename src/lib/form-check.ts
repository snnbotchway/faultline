import type { FormProblems } from '@/api/form-errors'

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
  for (const control of controls(form)) {
    const { validity, name } = control
    if (!name || fields[name]) continue
    if (validity.valueMissing || (control.required && !control.value.trim())) fields[name] = 'Fill this in.'
    else if (validity.typeMismatch && control.type === 'email') fields[name] = 'Enter a valid email address.'
    else if (validity.tooShort) fields[name] = `Use ${control.minLength} or more characters.`
    else if (validity.tooLong) fields[name] = `Use ${control.maxLength} characters or fewer.`
  }
  return { fields }
}

export const hasProblems = (problems: FormProblems) => !!problems.message || Object.keys(problems.fields).length > 0

// Moves focus to the first field, in screen order, that has a problem.
export function focusFirstProblem(form: HTMLFormElement | null, problems: FormProblems) {
  if (!form) return
  controls(form)
    .find((control) => control.name && problems.fields[control.name])
    ?.focus()
}
