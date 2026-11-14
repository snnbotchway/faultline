import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { AssigneeType, IssueStatus, cachedIssueLists, issueActions, issueKeys, type Issue, type IssueSelection, type IssueUpdate } from '@/api/issues'
import { failed } from '@/lib/notice'
import { statusOf } from './search'
import { StatusView } from './status'

export type Assignee = NonNullable<Issue['assignedTo']>

export type Change = { status?: IssueStatus; assignedTo?: Assignee | null; removed?: true }

export type Target = {
  selection: IssueSelection
  // The loaded rows the action touches, so the screen can update without waiting.
  ids: string[]
}

export const oneIssue = (id: string): Target => ({ selection: { ids: [id] }, ids: [id] })

/**
 * Shows a change at once in every loaded list: changed rows update, and rows that no
 * longer match the list's status leave it. Returns a function that puts the lists back.
 */
export function patchLists(queryClient: QueryClient, org: string, ids: string[], change: Change) {
  const changed = new Set(ids)
  const lists = cachedIssueLists(queryClient, org)
  for (const { key, filters, data } of lists) {
    if (!data) continue
    const view = statusOf(filters.query ?? '')
    const leaves = change.removed || (change.status !== undefined && view !== StatusView.all && view !== change.status)
    let gone = 0
    const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.flatMap((issue) => {
        if (!changed.has(issue.id)) return [issue]
        if (!leaves) return [{ ...issue, ...change }]
        gone += 1
        return []
      }),
    }))
    queryClient.setQueryData(key, {
      ...data,
      pages: pages.map((page) => ({ ...page, hits: page.hits === undefined ? undefined : Math.max(0, page.hits - gone) })),
    })
  }
  return () => {
    for (const { key, data } of lists) queryClient.setQueryData(key, data)
  }
}

// Applies the change on screen, sends it, and undoes it on screen if the backend refuses. `action` completes "Couldn't …".
export async function runAction(queryClient: QueryClient, org: string, target: Target, change: Change, request: () => Promise<unknown>, action: string) {
  const undo = patchLists(queryClient, org, target.ids, change)
  try {
    await request()
  } catch (error) {
    undo()
    failed(error, action)
    return false
  }
  for (const id of target.ids) void queryClient.invalidateQueries({ queryKey: issueKeys.detail(org, id) })
  // Acting on every match is finished in the background by the server, so a refetch now would undo the rows just updated.
  if ('ids' in target.selection) void queryClient.invalidateQueries({ queryKey: issueKeys.lists(org) })
  return true
}

const assigneeRef = (assignee: Assignee | null) => (assignee ? `${assignee.type}:${assignee.type === AssigneeType.team ? assignee.slug : assignee.id}` : '')

export function useIssueActions(org: string) {
  const queryClient = useQueryClient()
  return useMemo(() => {
    const update = (target: Target, change: Change, body: IssueUpdate, action: string) =>
      runAction(queryClient, org, target, change, () => issueActions.update(org, target.selection, body), action)
    const noun = (target: Target) => (target.ids.length === 1 && 'ids' in target.selection ? 'the issue' : 'the issues')
    return {
      setStatus: (target: Target, status: IssueStatus) => update(target, { status }, { status }, `update ${noun(target)}`),
      resolveInNextRelease: (target: Target) =>
        update(target, { status: IssueStatus.resolved }, { status: IssueStatus.resolved, statusDetails: { inNextRelease: true } }, `resolve ${noun(target)}`),
      assign: (target: Target, assignee: Assignee | null) => update(target, { assignedTo: assignee }, { assignedTo: assigneeRef(assignee) }, `assign ${noun(target)}`),
      // The newest issue survives a merge, so the list is simply refetched.
      merge: (ids: string[]) => runAction(queryClient, org, { selection: { ids }, ids: [] }, {}, () => issueActions.merge(org, ids), 'merge the issues'),
      remove: (target: Target) => runAction(queryClient, org, target, { removed: true }, () => issueActions.remove(org, target.selection), `delete ${noun(target)}`),
    }
  }, [queryClient, org])
}

export type IssueActions = ReturnType<typeof useIssueActions>
