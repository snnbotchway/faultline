import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { SessionStatus, sessionQuery } from '@/api/auth'
import { issueActions, issueCommentsQuery, issueKeys } from '@/api/issues'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useT } from '@/i18n'
import { failed } from '@/lib/notice'
import { ago, exact } from './format'
import { Section } from './issue-sections'

// The issue's comments. Anyone can add one; its author, or someone who manages the organization, can change it.
export function Comments({ org, issueId, canManage }: { org: string; issueId: string; canManage: boolean }) {
  const t = useT()
  const w = t.issues
  const queryClient = useQueryClient()
  const comments = useQuery(issueCommentsQuery(org, issueId))
  const session = useQuery(sessionQuery).data
  const me = session?.status === SessionStatus.authenticated ? String(session.user.id) : undefined
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<{ id: number; text: string }>()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: issueKeys.comments(org, issueId) })
    void queryClient.invalidateQueries({ queryKey: issueKeys.lists(org) })
  }
  const add = useMutation({
    mutationFn: () => issueActions.comment(org, issueId, text.trim()),
    onSuccess: () => {
      setText('')
      refresh()
    },
    onError: (error) => failed(error, w.actions.addComment),
  })
  const edit = useMutation({
    mutationFn: (comment: { id: number; text: string }) => issueActions.editComment(org, issueId, comment.id, comment.text.trim()),
    onSuccess: () => {
      setEditing(undefined)
      refresh()
    },
    onError: (error) => failed(error, w.actions.saveComment),
  })
  const remove = useMutation({
    mutationFn: (id: number) => issueActions.deleteComment(org, issueId, id),
    onSuccess: refresh,
    onError: (error) => failed(error, w.actions.deleteComment),
  })
  const [removing, setRemoving] = useState<number>()

  return (
    <Section title={w.comments.title} count={comments.data?.length}>
      <ul className="space-y-4">
        {comments.data?.map((comment) => {
          const id = comment.id
          if (id == null) return null
          const canChange = canManage || (me !== undefined && String(comment.user?.id) === me)
          return (
            <li key={id} className="border-l pl-3">
              <p className="mono flex flex-wrap items-center gap-x-3 text-muted-foreground">
                <span className="text-foreground">{comment.user?.email ?? w.comments.someone}</span>
                <time dateTime={comment.dateCreated} title={exact(comment.dateCreated)}>
                  {ago(comment.dateCreated)}
                </time>
                {canChange && editing?.id !== id && (
                  <span className="ml-auto flex gap-3 font-sans text-sm">
                    {removing === id ? (
                      <>
                        <button type="button" className="font-medium text-destructive hover:underline" onClick={() => remove.mutate(id)}>
                          {w.comments.delete}
                        </button>
                        <button type="button" className="hover:text-foreground" onClick={() => setRemoving(undefined)}>
                          {t.common.keep}
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="hover:text-foreground" onClick={() => setEditing({ id, text: comment.data.text ?? '' })}>
                          {t.common.edit}
                        </button>
                        <button type="button" className="hover:text-destructive" onClick={() => setRemoving(id)}>
                          {t.common.delete}
                        </button>
                      </>
                    )}
                  </span>
                )}
              </p>
              {editing && editing.id === id ? (
                <form
                  className="mt-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (editing.text.trim()) edit.mutate(editing)
                  }}
                >
                  <Textarea autoFocus rows={3} value={editing.text} onChange={(event) => setEditing({ ...editing, text: event.target.value })} aria-label={w.comments.edit} />
                  <div className="mt-2 flex gap-2">
                    <Button type="submit" variant="default" size="sm" disabled={edit.isPending}>
                      {t.common.save}
                    </Button>
                    <Button size="sm" onClick={() => setEditing(undefined)}>
                      {t.common.cancel}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="prose-text mt-1 whitespace-pre-wrap">{comment.data.text}</p>
              )}
            </li>
          )
        })}
      </ul>
      <form
        className={comments.data?.length ? 'mt-4' : undefined}
        onSubmit={(event) => {
          event.preventDefault()
          if (text.trim()) add.mutate()
        }}
      >
        <Textarea
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => (event.metaKey || event.ctrlKey) && event.key === 'Enter' && text.trim() && add.mutate()}
          placeholder={w.comments.add}
          aria-label={w.comments.add}
        />
        {text.trim() && (
          <Button type="submit" size="sm" className="mt-2" disabled={add.isPending} aria-busy={add.isPending}>
            {w.comments.submit}
          </Button>
        )}
      </form>
    </Section>
  )
}
