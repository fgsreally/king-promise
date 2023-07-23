import { EventEmitter } from 'node:events'
import type { BuckInfo } from '../interface'

export class Status<StatusOptions extends { rollingCountBuckets: number; rollingCountTimeout: number }> extends EventEmitter {
  BUCKETS: number
  TIMEOUT: number
  WINDOW: BuckInfo[]
  private _bucktimer: NodeJS.Timer
  private _snaptimer: NodeJS.Timer
  constructor(public options: StatusOptions) {
    super()

    // Set up our statistical rolling window
    this.BUCKETS = options.rollingCountBuckets
    this.TIMEOUT = options.rollingCountTimeout
    // 初始化窗口
    this.WINDOW = new Array(this.BUCKETS).fill({})
    this.WINDOW = this.WINDOW.map(() => {
      return {
        failure: [],
        success: [],
        reject: [],
        run: 0,
        timeout: [],
        semaphoreLocked: [],

      }
    })
    const bucketInterval = Math.floor(this.TIMEOUT / this.BUCKETS)
    this._bucktimer = setInterval(nextBucket(this.WINDOW), bucketInterval)

    this._snaptimer = setInterval(
      () => this.emit('snapshot', this.WINDOW),
      bucketInterval,
    )
  }

  increment(params: any): void {
    (this.WINDOW[0][params.type as keyof BuckInfo] as any[]).push(params)
    this.WINDOW[0].run++
  }

  shutdown(): void {
    this.removeAllListeners()
    clearInterval(this._bucktimer)
    clearInterval(this._snaptimer)
  }
}

function nextBucket(window: BuckInfo[]) {
  return () => {
    window.pop()
    window.unshift({
      failure: [],
      success: [],
      reject: [],
      run: 0,
      timeout: [],
      semaphoreLocked: [],
    })
  }
}
