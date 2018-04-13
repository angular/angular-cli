/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export function mapObject<T, V>(obj: {[k: string]: T},
                                mapper: (k: string, v: T) => V): {[k: string]: V} {
  return Object.keys(obj).reduce((acc: {[k: string]: V}, k: string) => {
    acc[k] = mapper(k, obj[k]);

    return acc;
  }, {});
}


const copySymbol = Symbol();

// tslint:disable-next-line:no-any
export function deepCopy<T extends any> (value: T): T {
  if (Array.isArray(value)) {
    return value.map((o: T) => deepCopy(o));
  } else if (value && typeof value === 'object') {
    if (value[copySymbol]) {
      // This is a circular dependency. Just return the cloned value.
      return value[copySymbol];
    }
    if (value['toJSON']) {
      return JSON.parse((value['toJSON'] as () => string)());
    }

    const copy = new (Object.getPrototypeOf(value).constructor)();
    value[copySymbol] = copy;
    for (const key of Object.getOwnPropertyNames(value)) {
      copy[key] = deepCopy(value[key]);
    }
    value[copySymbol] = undefined;

    return copy;
  } else {
    return value;
  }
}
