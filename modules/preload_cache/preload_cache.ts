interface Deferred {
  reject(): any;
  resolve(value?: any): any;
  promise: Promise;

}

interface Refs<T> {
  [key: string]: T;
}

export class PreloadCache {
  refs: Refs<Deferred> = {};
  constructor() {

  }

  getRef(key: string): Promise {
    let ref = this.refs[key];
    if (ref && ref.promise) {
      return ref.promise;
    }
  }

  setRef(ref: string): Deferred {
    var reject, resolve;

    var promise = new Promise(function(res, rej) {
      reject = rej;
      resolve = res;
    });

    var dfd = {
      reject,
      resolve,
      promise
    };

    return this.refs[ref] = dfd;
  }

  createRefs(...args: Array<string>): void {
    args.forEach(ref => this.setRef(ref));
  }

  complete(key, value): void {
    let ref = this.refs[key];
    if (ref && ref.resolve) {
      this.refs[key].resolve(value);
    }
  }

}
