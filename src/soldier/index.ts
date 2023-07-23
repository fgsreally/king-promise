import type { BuckInfo, S_EventInfo, TaskOptions } from '../interface'
import { STATE } from '../enum'
import { King } from '../king'
import { taskPool } from './pool'
import { Status } from './status'

type SoldierEvent = 'success' | 'failure' | 'semaphoreLocked' | 'run' | 'disconnect' | 'retry' | 'timeout' | 'connect' | 'shutdown'

export class Soldier<Task extends (...args: any) => Promise<any>> extends Status<Required<TaskOptions>> {
  type = 'soldier'
  state: string = STATE.RUN
  _retryTimer: NodeJS.Timer
  _warmUpTimer: NodeJS.Timer
  hasLeader = false
  warmUp = false
  taskPool: taskPool
  constructor(
    public name: string,
    public task: Task,
    options: TaskOptions = {},
    public metadata?: any,
  ) {
    super({
      timeout: 10000, // 任务超时
      errorThresholdPercentage: 50, // 错误率限制
      rollingCountTimeout: 10000, //
      rollingCountBuckets: 1, //
      rollingPercentilesEnabled: false, // 是否允许窗口百分比检测
      capacity: Number.MAX_SAFE_INTEGER, // 池内令牌
      volumeThreshold: 0, // 最小保护数目，当任务执行数小于这个，无论如何不会断开
      allowWarmUp: true, // 在初始启动，以及重连时，是否允许预热，即此时段失败无论如何不会断开
      errorFilter: () => false, // 错误处理，如果返回true就不会进入断开的逻辑
      retry: true, // 是否打开retry模式
      resetTimeout: 30000, // 重连时段
      retryTimes: 3, // 重试次数
      warmTimeout: 10000, // 冷启动
      maxFailures: Number.MAX_SAFE_INTEGER, // 最多容忍几次错误
      abandon: true, // 是否放弃超量的请求
      ...options,
    })

    this.name = name
    if (metadata)
      this.metadata = metadata

    // 初始化令牌库和状态
    this.taskPool = new taskPool(options.capacity || Number.MAX_SAFE_INTEGER)

    if (this.options.allowWarmUp) {
      this.warmUp = true
      this._warmUpTimer = setTimeout(
        () => (this.warmUp = false),
        this.options.rollingCountTimeout,
      )
    }

    ['success', 'failure', 'timeout', 'semaphoreLocked'].forEach((e) => {
      this.on(e as SoldierEvent, this.increment.bind(this))
    })
    // 进入重试的逻辑
    this.on('retry', this.startTimer())
    this.on('disconnect', () => {
      this.state = STATE.DISABELD
    })

    King.register(name, this)
  }
  //

  on(eventName: SoldierEvent, handler: (params: S_EventInfo) => any) {
    return super.on(eventName, handler)
  }

  // 显式调用闭合
  connect(): void {
    if (this.state !== STATE.RUN) {
      if (this._retryTimer)
        clearInterval(this._retryTimer)

      this.state = STATE.RUN
      //   this[PENDING_CLOSE] = false;
      this.emit('connect')
    }
  }

  // 程序内部调用闭合，也即断开后重连
  protected _connect(): void {
    if (this.state !== STATE.RUN) {
      // 清理重连的timer
      if (this._retryTimer)
        clearInterval(this._retryTimer)

      // 重连后令牌库数目重置，重新进入保护时间，时长为warmtimeout
      if (this.options.allowWarmUp) {
        this.taskPool.retry(this.options.warmTimeout)
        this.warmUp = true
        this._warmUpTimer = setTimeout(
          () => (this.warmUp = false),
          this.options.warmTimeout,
        )
      }
      this.state = STATE.RUN
      this.emit('connect')
    }
  }

  // 出现问题时断开
  protected _retry(...args: any): void {
    if (this.options.retry) {
      this.state = STATE.RETRY
      this.emit('retry', ...args)
    }
    else {
      this.state = STATE.DISABELD
      this.emit('disconnect')
    }
  }

  // 彻底关停，不能重启！
  shutdown() {
    super.shutdown()
    if (this._retryTimer)
      clearTimeout(this._retryTimer)

    if (this._warmUpTimer)
      clearTimeout(this._warmUpTimer)

    this.state = STATE.SHUTDOWN

    this.emit('shutdown')
  }

  // 显示执行命令，当为opened，halfopen的时候reject
  run(...args: Parameters<Task>): ReturnType<Task> | Promise<Error> {
    if (!this.hasLeader && this.state !== STATE.RUN) {
      this.emit('reject', args)
      return Promise.reject({ error: 'reject', state: this.state })
    }
    this.emit('run', args)
    return this._run(args)
  }

  // 执行命令，即使此时是断开，依然执行，用于重试时
  private _run(args: Parameters<Task>, isRetry = false): any {
    let timeout: NodeJS.Timer
    let timeoutError = false

    const latencyStartTime = Date.now()
    if (!isRetry && !this.taskPool.start()) {
      const S_EventInfo = { args, type: 'semaphoreLocked' }
      this.emit('semaphoreLocked', S_EventInfo)
      this.handleError(S_EventInfo)
      if (!this.hasLeader)
        return Promise.reject({ state: this.state, error: 'semaphoreLocked' })
    }
    if (!isRetry && this.options.timeout) {
      timeout = setTimeout(() => {
        timeoutError = true
        this.taskPool.release()
        this.emit('timeout', { args, type: 'timeout' })
        this.handleError({ args, type: 'timeout' })
      }, this.options.timeout)
    }

    return this.task(...(args as any))
      // 任务执行成功
      .then((result) => {
        this.emit('success', { args, type: 'success', time: Date.now() - latencyStartTime })

        if (!isRetry) {
          this.taskPool.release()

          if (!timeoutError)

            clearTimeout(timeout)

          else
            return Promise.reject({ state: this.state, error: 'timeout' })

          return Promise.resolve(result)
        }
      })
      // 任务执行失败，转交错误
      .catch((error) => {
        if (!isRetry) {
          if (!timeoutError) {
            clearTimeout(timeout)
            this.taskPool.release()
            this.handleError({ args, type: 'failure', time: Date.now() - latencyStartTime })
          }

          return Promise.reject(error)
        }
      })
  }

  handleError(params: S_EventInfo) {
    if (this.options.errorFilter?.(params)) {
      params.type = 'success'
      // 如果有错误处理，那么本次任务也算是成功
      this.emit('success', params)
    }
    else {
      // 当彻底失败时，才执行fallback
      this.fail(params)
    }
  }

  fail(params: { type: string; args?: any }) {
    // 如果处于预热保护，不记录失败
    if (this.warmUp)
      return
    this.emit('failure', params)

    // 检查状态是否达到断开的条件
    const stats = this.stats
    if (stats.run < this.options.volumeThreshold)
      return
    const errorRate = (stats.failure / stats.run) * 100
    if (
      errorRate > this.options.errorThresholdPercentage
      || stats.failure >= this.options.maxFailures
    )
      this._retry(...params.args)
  }

  get stats() {
    const totals = {
      success: 0,
      failure: 0,
      run: 0,
      timeout: 0,
      semaphoreLocked: 0,
    }
    for (const buck of this.WINDOW) {
      ['success', 'failure', 'timeout', 'semaphoreLocked'].forEach((item) => {
        totals[item as keyof typeof totals] += (buck[item as keyof BuckInfo] as S_EventInfo[]).length
      })
      totals.run += buck.run
    }
    return totals
  }

  startTimer() {
    let i = 0
    return (...args: any) => {
      this._retryTimer = setInterval(() => {
        if (i === 0) {
          this.once('success', () => {
            this._connect()
            i = 0
          })
        }
        i++

        this._run(args, true)
        if (i >= this.options.retryTimes) {
          i = 0
          clearInterval(this._retryTimer)
          this.emit('disconnect')
        }
      }, this.options.resetTimeout)
    }
  }
}
