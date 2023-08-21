interface TaskOptions {
  // 超时
  timeout?: number
  // 最多容忍错误

  maxFailures?: number
  resetTimeout?: number
  // 时间窗口时长

  rollingCountTimeout?: number
  // 时间窗口数
  rollingCountBuckets?: number
  // 池内令牌,同时最多运行数
  capacity?: number
  // 错误率限制
  errorThresholdPercentage?: number
  // enabled?: boolean;
  // 允许热启动保护

  allowWarmUp?: boolean
  // 初始保护数目
  volumeThreshold?: number
  // 错误过滤
  errorFilter?: (event: S_EventInfo) => boolean
  // 允许重试
  retry?: boolean
  // 重试次数

  retryTimes?: number
  // 热启动保护时长

  warmTimeout?: number
  abandon?: boolean
}

interface Bucks {
  isCircuitBreakerOpen: boolean
  failures: number
  fallbacks: number
  successes: number
  rejects: number
  fires: number
  timeout: number
  semaphoreLocked: number
  percentiles: any
  latencyTimes: number[]
  latencyMean?: number
}

interface BuckInfo {
  failure: S_EventInfo[]
  success: S_EventInfo[]
  reject: S_EventInfo[]
  run: number
  timeout: S_EventInfo[]
  semaphoreLocked: S_EventInfo[]
}
export { TaskOptions, Bucks, BuckInfo }

export interface ErrorEvent { type: string; args?: any }

export interface S_EventInfo { type: string; args?: any; time?: number }

export interface G_EventInfo {
  time: number
}
