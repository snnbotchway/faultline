// The rule whose editor is open: its id, or `new` for one not made yet, and the project it belongs to.
export type OpenRule = { alert: string; project: string }

// The `alert` value that opens the editor on a new rule.
export const RuleEditor = { new: 'new' } as const
export type RuleEditor = (typeof RuleEditor)[keyof typeof RuleEditor]
