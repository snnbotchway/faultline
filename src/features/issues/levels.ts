import { IssueLevel } from '@/api/issues'

export const Shape = { square: 'square', triangle: 'triangle', dot: 'dot', ring: 'ring' } as const
export type Shape = (typeof Shape)[keyof typeof Shape]

// Level by shape as well as colour: square for errors, triangle for warnings, circle for the rest.
const LEVEL: Record<IssueLevel, { color: string; shape: Shape }> = {
  [IssueLevel.fatal]: { color: 'text-level-fatal', shape: Shape.square },
  [IssueLevel.error]: { color: 'text-level-error', shape: Shape.square },
  [IssueLevel.warning]: { color: 'text-level-warning', shape: Shape.triangle },
  [IssueLevel.info]: { color: 'text-level-info', shape: Shape.dot },
  [IssueLevel.debug]: { color: 'text-level-debug', shape: Shape.ring },
}

const isLevel = (level: string): level is IssueLevel => Object.hasOwn(LEVEL, level)

// How a level is drawn; a level this app does not know is drawn as debug.
export const levelStyle = (level: string) => (isLevel(level) ? LEVEL[level] : LEVEL[IssueLevel.debug])
