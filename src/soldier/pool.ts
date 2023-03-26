export class taskPool {
  count: number=0;
  abandon: boolean;
  resolvers: Function[]=[];
  _retrytimer: any;
  constructor( public limit: number,) {
  }
  start() {
    if (this.count >= this.limit) return false;
    return this.take() && true;
  }
  release(): void {
    this.count++;
    if (!this.abandon)
      if (this.resolvers.length > 0) {
        this.resolvers.shift()?.();
      }
  }
  retry(time:number) {
    let count = this.count;
    this.count = 0;
    this._retrytimer = setInterval(() => {
      this.count += count / 10;
      if (this.count === count) clearInterval(this._retrytimer);
    }, time / 10);
  }
  take(timeout?: number) {
    if (this.count > 0) {
      ++this.count;
      return Promise.resolve(this.release);
    }
    if (!this.abandon)
      return new Promise((resolve, reject) => {
        this.resolvers.push(() => {
          ++this.count;
          resolve(this.release);
        });
        if (timeout) {
          setTimeout(() => {
            this.resolvers.shift();
            const err = new Error();
            err.message = `Timed out after ${timeout}ms`;
            err.name = "ETIMEDOUT";
            reject(err);
          }, timeout);
        }
      });
  }
}
