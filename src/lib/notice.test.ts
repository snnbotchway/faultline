import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearNotice, holdNotice, notify, NoticeHold, releaseNotice, useNotice } from './notice'

const SHOWN_FOR = 6000

function shown() {
  return renderHook(() => useNotice()).result
}

const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('notice hold', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    act(() => clearNotice())
    vi.useRealTimers()
  })

  it('stays while held, however long', () => {
    const notice = shown()
    act(() => notify('Resolved'))
    holdNotice(NoticeHold.pointer, true)
    wait(SHOWN_FOR * 10)
    expect(notice.current?.text).toBe('Resolved')
  })

  it('goes its full time after both pointer and focus let go', () => {
    const notice = shown()
    act(() => notify('Resolved'))
    holdNotice(NoticeHold.pointer, true)
    holdNotice(NoticeHold.focus, true)
    holdNotice(NoticeHold.pointer, false)
    wait(SHOWN_FOR * 2)
    expect(notice.current?.text).toBe('Resolved')

    holdNotice(NoticeHold.focus, false)
    wait(SHOWN_FOR - 1)
    expect(notice.current?.text).toBe('Resolved')
    wait(1)
    expect(notice.current).toBeUndefined()
  })

  it('does not carry a hold over to the message that replaces it', () => {
    const notice = shown()
    act(() => notify('Resolved'))
    holdNotice(NoticeHold.focus, true)
    act(() => notify('Ignored'))
    wait(SHOWN_FOR)
    expect(notice.current).toBeUndefined()
  })

  it('does not carry a hold over a cleared message to the next one', () => {
    const notice = shown()
    act(() => notify('Resolved'))
    holdNotice(NoticeHold.pointer, true)
    act(() => clearNotice())
    act(() => notify('Ignored'))
    wait(SHOWN_FOR)
    expect(notice.current).toBeUndefined()
  })

  it('lets go when the message is taken off the page while held', () => {
    const notice = shown()
    act(() => notify('Resolved'))
    holdNotice(NoticeHold.pointer, true)
    releaseNotice()
    wait(SHOWN_FOR)
    expect(notice.current).toBeUndefined()
  })
})
