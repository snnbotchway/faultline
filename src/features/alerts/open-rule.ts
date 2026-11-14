// The `alert` value that opens the editor on a new rule.
export const RuleEditor = { new: 'new' } as const
export type RuleEditor = (typeof RuleEditor)[keyof typeof RuleEditor]

// An `alert=` address value: a rule's id, or `new`. The id stays a number, so the address reads `alert=6` as the stock links do.
export type AlertParam = number | RuleEditor

export function alertParam(value: unknown): AlertParam | undefined {
  if (value === RuleEditor.new) return RuleEditor.new
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : undefined
}

// The rule whose editor is open, and the project it belongs to.
export type OpenRule = { alert: AlertParam; project: string }
