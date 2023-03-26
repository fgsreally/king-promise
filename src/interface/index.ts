interface TaskOptions {
  timeout?: number;
  maxFailures?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  rollingPercentilesEnabled?: boolean;
  capacity?: number;
  errorThresholdPercentage?: number;
  // enabled?: boolean;
  allowWarmUp?: boolean;
  // warmupTime?: number;
  volumeThreshold?: number;
  errorFilter?: Function;
  retry?: boolean;
  retryTimes?: number;
  warmTimeout?: number;
  abandon?: boolean;
}

interface Bucks {
  isCircuitBreakerOpen: boolean;
  failures: number;
  fallbacks: number;
  successes: number;
  rejects: number;
  fires: number;
  timeout: number;
  semaphoreLocked: number;
  percentiles: Object;
  latencyTimes: number[];
  latencyMean?: number;
}

interface BuckInfo {
  failure: S_EventInfo[],
  success: S_EventInfo[],
  reject: S_EventInfo[],
  run: number,
  timeout: S_EventInfo[],
  semaphoreLocked: S_EventInfo[],
}
export { TaskOptions, Bucks, BuckInfo };


export interface ErrorEvent { type: string, args?: any }


export interface S_EventInfo { type: string, args?: any, time?: number }

export interface G_EventInfo{
  time:number
}