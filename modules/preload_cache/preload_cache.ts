/// <reference path="../../custom_typings/_custom.d.ts"/>


interface Deferred<T> {
  reject(): any;
  resolve(value?: any): any;
  promise: Promise<T>;

}

interface Refs<T> {
  [key: string]: T;
}

export class PreloadCache<T> {
  refs: Refs<Deferred<T>> = {};
  constructor() {

  }

  getRef(key: string): Promise<T> {
    let ref = this.refs[key];
    if (ref && ref.promise) {
      return ref.promise;
    }
  }

  setRef(ref: string): Deferred<T> {
    var reject, resolve;

    var promise = new Promise<T>(function(res, rej) {
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
