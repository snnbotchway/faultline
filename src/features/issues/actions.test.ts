import { QueryClient } from '@tanstack/react-query'
import { expect, test, vi } from 'vitest'
import { IssueStatus, issueKeys, type Issue, type IssueListData } from '@/api/issues'
import { oneIssue, runAction } from './actions'

const org = 'demo-co'
const issue = (id: string) => ({ id, status: IssueStatus.unresolved }) as Issue
const list = (...ids: string[]): IssueListData => ({ pages: [{ items: ids.map(issue), cursors: {}, hits: ids.length }], pageParams: [undefined] })

function cache() {
  const queryClient = new QueryClient()
  const unresolved = issueKeys.list(org, { query: 'is:unresolved' })
  const everything = issueKeys.list(org, { query: '' })
  queryClient.setQueryData(unresolved, list('1', '2'))
  queryClient.setQueryData(everything, list('1', '2'))
  const ids = (key: readonly unknown[]) => queryClient.getQueryData<IssueListData>(key)!.pages[0]!.items.map((item) => `${item.id}:${item.status}`)
  return { queryClient, unresolved, everything, ids }
}

test('a resolved issue leaves the unresolved list at once and stays, updated, in the list of everything', async () => {
  const { queryClient, unresolved, everything, ids } = cache()
  let during: string[] = []
  const done = await runAction(queryClient, org, oneIssue('1'), { status: IssueStatus.resolved }, async () => void (during = ids(unresolved)), 'update the issue')
  expect(done).toBe(true)
  expect(during).toEqual(['2:unresolved'])
  expect(ids(everything)).toEqual(['1:resolved', '2:unresolved'])
})

test('a refused action puts every list back as it was', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const { queryClient, unresolved, everything, ids } = cache()
  const refuse = () => Promise.reject(new Error('refused'))
  const done = await runAction(queryClient, org, oneIssue('1'), { status: IssueStatus.resolved }, refuse, 'update the issue')
  expect(done).toBe(false)
  expect(ids(unresolved)).toEqual(['1:unresolved', '2:unresolved'])
  expect(ids(everything)).toEqual(['1:unresolved', '2:unresolved'])
  expect(queryClient.getQueryData<IssueListData>(unresolved)!.pages[0]!.hits).toBe(2)
})
