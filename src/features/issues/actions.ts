import { useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query'
import { issueActions, issueKeys, type Issue, type IssueFilters, type IssueSelection, type IssueStatus, type IssueUpdate } from '@/api/issues'
import type { Page } from '@/api/pagination'
import { failed } from '@/lib/notice'
import { statusOf } from './search'

export type Assignee = NonNullable<Issue['assignedTo']>

type Change = { status?: IssueStatus; assignedTo?: Assignee | null; removed?: true }

// Show the result at once in every loaded list: changed rows update, and rows that no longer match the list's status leave it.
function patchLists(queryClient: QueryClient, org: string, ids: Set<string>, change: Change) {
  const lists = queryClient.getQueriesData<InfiniteData<Page<Issue>>>({ queryKey: [...issueKeys.all(org), 'list'] })
  for (const [key, data] of lists) {
    if (!data) continue
    const listStatus = statusOf((key.at(-1) as IssueFilters).query ?? '')
    const leaves = change.removed || (change.status !== undefined && listStatus !== undefined && listStatus !== change.status)
    let gone = 0
    const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.flatMap((issue) => {
        if (!ids.has(issue.id)) return [issue]
        if (leaves) {
          gone += 1
          return []
        }
        return [{ ...issue, ...change }]
      }),
    }))
    queryClient.setQueryData(key, {
      ...data,
      pages: pages.map((page) => ({ ...page, hits: page.hits === undefined ? undefined : Math.max(0, page.hits - gone) })),
    })
  }
}

export type Target = {
  selection: IssueSelection
  // The loaded rows the action touches, so the screen can update without waiting.
  ids: string[]
}

export const oneIssue = (id: string): Target => ({ selection: { ids: [id] }, ids: [id] })

export function useIssueActions(org: string) {
  const queryClient = useQueryClient()

  async function run(target: Target, change: Change, request: () => Promise<unknown>) {
    const previous = queryClient.getQueriesData({ queryKey: [...issueKeys.all(org), 'list'] })
    patchLists(queryClient, org, new Set(target.ids), change)
    try {
      await request()
    } catch (error) {
      for (const [key, data] of previous) queryClient.setQueryData(key, data)
      failed(error)
      return false
    }
    for (const id of target.ids) void queryClient.invalidateQueries({ queryKey: issueKeys.detail(org, id) })
    // Acting on every match is finished in the background by the server, so a refetch now would undo the rows just updated.
    if ('ids' in target.selection) void queryClient.invalidateQueries({ queryKey: [...issueKeys.all(org), 'list'] })
    return true
  }

  const update = (target: Target, change: Change, body: IssueUpdate) => run(target, change, () => issueActions.update(org, target.selection, body))

  return {
    setStatus: (target: Target, status: IssueStatus) => update(target, { status }, { status }),
    resolveInNextRelease: (target: Target) =>
      update(target, { status: 'resolved' }, { status: 'resolved', statusDetails: { inNextRelease: true } }),
    assign: (target: Target, assignee: Assignee | null) =>
      update(target, { assignedTo: assignee }, { assignedTo: assignee ? `${assignee.type}:${assignee.type === 'team' ? assignee.slug : assignee.id}` : '' }),
    // The newest issue survives a merge, so the list is simply refetched.
    merge: (ids: string[]) => run({ selection: { ids }, ids: [] }, {}, () => issueActions.merge(org, ids)),
    remove: (target: Target) => run(target, { removed: true }, () => issueActions.remove(org, target.selection)),
  }
}

export type IssueActions = ReturnType<typeof useIssueActions>
