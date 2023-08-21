/* eslint-disable prefer-promise-reject-errors */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { General } from '../src/general'
import { Soldier } from '../src/soldier'
import { STATE } from '../src/enum'

describe('general', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('basic', async () => {
    const fakeTask = vi.fn((param: number) => new Promise<boolean>((resolve, reject) => {
      if (param > 0)
        resolve(true)
      else reject(false)
    }))

    const S = new Soldier('basic', fakeTask, {
      volumeThreshold: 0, allowWarmUp: false, retry: false, maxFailures: 1,

    })
    const G = new General<{ basic: typeof S }>('basic', [S])
    await G.run(async (s) => {
      await s.basic.run(1)// success
      await s.basic.run(0).catch(() => {})// error
    })
    expect(S.state).toBe(STATE.DISABELD)
    expect(G.isActive).toBe(false)
  })
})
