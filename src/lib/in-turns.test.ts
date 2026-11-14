import { expect, test } from 'vitest'
import { inTurns } from './in-turns'

test('calls wait for a turn, run in the order they came, and a failed one frees its turn', async () => {
  const turns = inTurns(2)
  const started: number[] = []
  const finish: (() => void)[] = []
  const calls = [0, 1, 2, 3].map((id) =>
    turns(
      () =>
        new Promise<number>((resolve, reject) => {
          started.push(id)
          finish[id] = () => (id === 0 ? reject(new Error('failed')) : resolve(id))
        }),
    ),
  )
  const settled = Promise.allSettled(calls)
  await Promise.resolve()
  expect(started).toEqual([0, 1])
  finish[0]!()
  await new Promise((resolve) => setTimeout(resolve))
  expect(started).toEqual([0, 1, 2])
  finish[1]!()
  await new Promise((resolve) => setTimeout(resolve))
  expect(started).toEqual([0, 1, 2, 3])
  finish[2]!()
  finish[3]!()
  expect((await settled).map((result) => result.status)).toEqual(['rejected', 'fulfilled', 'fulfilled', 'fulfilled'])
})
