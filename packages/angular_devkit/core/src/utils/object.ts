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

// tslint:disable-next-line:no-any
export function deepCopy<T extends any> (object: T): T {
  if (Array.isArray(object)) {
    // tslint:disable-next-line:no-any
    return object.map((o: any) => deepCopy(o));
  } else if (typeof object === 'object') {
    if (object['toJSON']) {
      return JSON.parse((object['toJSON'] as () => string)());
    }

    const copy = {} as T;
    for (const key of Object.keys(object)) {
      copy[key] = deepCopy(object[key]);
    }

    return copy;
  } else {
    return object;
  }
}
