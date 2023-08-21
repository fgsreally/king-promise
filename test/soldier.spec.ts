/* eslint-disable prefer-promise-reject-errors */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Soldier } from '../src/soldier'
import { STATE } from '../src/enum'

describe('soldier', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('basic', async () => {
    const fakeTask = vi.fn((param: number) => new Promise<number>((resolve, reject) => {
      if (param < 2)
        resolve(1)
      else reject(1)
    }))

    const fakeRej = vi.fn(() => { })
    const s = new Soldier('basic', fakeTask, {
      volumeThreshold: 5, allowWarmUp: false, retry: false,
    })
    let i = 0
    while (i++ < 6)
      await s.run(i).catch(fakeRej)

    const stat = s.stats
    expect(fakeTask).toBeCalledTimes(5)
    expect(fakeRej).toBeCalledTimes(5)
    expect(stat.success).toBe(1)
    expect(stat.failure).toBe(4)
  })

  it('break with maxFailures', async () => {
    const fakeTask = vi.fn((param: number) => new Promise<number>((resolve, reject) => {
      if (param < 2)
        resolve(1)
      else reject(1)
    }))

    const fakeRej = vi.fn(() => { })

    const s = new Soldier('maxFailures', fakeTask, {
      volumeThreshold: 0, allowWarmUp: false, retry: false, maxFailures: 1,
    })
    await s.run(3).catch(fakeRej)

    await expect(s.run(1)).rejects.toMatchObject({
      error: 'reject',
    })
  })

  it('break with errorThresholdPercentage', async () => {
    const fakeTask = vi.fn((param: number) => new Promise<boolean>((resolve, reject) => {
      if (param < 3)
        resolve(true)
      else reject(false)
    }))

    const fakeRej = vi.fn(() => { })

    const s = new Soldier('errorThresholdPercentage', fakeTask, {
      volumeThreshold: 0, allowWarmUp: false, retry: false,
    })
    let i = 0
    while (i++ < 5) {
      await s.run(i).catch(fakeRej)
      if (i === 4)
        expect(s.state).toBe(STATE.RUN)
    }
    expect(s.state).toBe(STATE.DISABELD)
  })
  it('won\'t break with leader', async () => {
    const fakeTask = vi.fn((param: number) => new Promise<boolean>((resolve, reject) => {
      if (param < 2)
        reject(false)
      else resolve(true)
    }))
    const fakeRej = vi.fn(() => { })
    const s = new Soldier('leader', fakeTask, {
      allowWarmUp: false, resetTimeout: 100, retryTimes: 1,
    })
    s.hasLeader = true
    await s.run(1).catch(fakeRej)
    expect(s.stats.failure).toBe(1)
    expect(s.state).toBe(STATE.RETRY)
    vi.runOnlyPendingTimers()
    expect(s.state).toBe(STATE.DISABELD)
    expect(await s.run(3)).toBeTruthy()
  })

  it('with warmup', async () => {
    const fakeTask = vi.fn((param: number) => new Promise<number>((resolve, reject) => {
      if (param < 2)
        resolve(1)
      else reject(1)
    }))

    const fakeRej = vi.fn(() => { })
    const s = new Soldier('3', fakeTask, {
      volumeThreshold: 5, retry: false,
    })
    let i = 0
    while (i++ < 6)
      await s.run(i).catch(fakeRej)

    const stat = s.stats
    expect(fakeTask).toBeCalledTimes(6)
    expect(stat.failure).toBe(0)
  })

  it('retry', async () => {
    let index = 1
    const fakeTask = vi.fn(() => new Promise<number>((resolve, reject) => {
      if (index === 1)
        reject(index++)
      else resolve(index)
    }))

    const fakeRej = vi.fn(() => { })
    const s = new Soldier('4', fakeTask, {
      allowWarmUp: false, resetTimeout: 100, retryTimes: 1,
    })
    await s.run().catch(fakeRej)

    expect(s.state).toBe(STATE.RETRY)

    await vi.runOnlyPendingTimersAsync()
    expect(s.state).toBe(STATE.RUN)
    expect(await s.run()).toBe(2)
  })
})
