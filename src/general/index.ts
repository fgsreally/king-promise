import type { G_EventInfo } from '../interface'
import { King } from '../king'
import type { Soldier } from '../soldier'
import { Status } from '../soldier/status'

interface GeneralOptions {
  rollingCountBuckets: number
  rollingCountTimeout: number
}

type GeneralEvent = 'success' | 'reject'

export class General<S extends Record<string, Soldier<any>>> extends Status<GeneralOptions> {
  type = 'general'
  isActive = true
  errorInfo: string
  soldiers: S = {} as any
  constructor(public name: string, soldiers: Soldier<any>[], options?: Partial<GeneralOptions>) {
    super({
      rollingCountBuckets: 10,
      rollingCountTimeout: 1000,
      ...options,
    })

    soldiers.forEach((soldier) => {
      (this.soldiers as any)[soldier.name] = soldier
      soldier.hasLeader = true
      soldier.on('retry', () => this.onDisconnect())
      soldier.on('disconnect', () => this.onDisconnect())
      soldier.on('connect', () => this.onConnect())
    });

    ['success', 'reject'].forEach((e) => {
      this.on(e as GeneralEvent, this.increment.bind(this))
    })

    King.register(name, this)
  }

  on(eventName: GeneralEvent, handler: (params: G_EventInfo) => any) {
    return super.on(eventName, handler)
  }

  async run<F extends (s: S) => any>(cb: F) {
    if (!this.isActive) {
      this.emit('reject', { time: Date.now(), type: 'reject' })
      return Promise.reject(this.errorInfo)
    }
    this.emit('success', { time: Date.now(), type: 'success' })

    return cb(this.soldiers)
  }

  onDisconnect() {
    this.isActive = false
  }

  onConnect() {
    this.isActive = false
  }
}
