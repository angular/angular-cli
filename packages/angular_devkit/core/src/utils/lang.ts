/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Borrowed from @angular/core
import { Observable } from 'rxjs';

/**
 * Determine if the argument is shaped like a Promise
 */
// tslint:disable-next-line:no-any
export function isPromise(obj: any): obj is Promise<any> {
  // allow any Promise/A+ compliant thenable.
  // It's up to the caller to ensure that obj.then conforms to the spec
  return !!obj && typeof obj.then === 'function';
}

/**
 * Determine if the argument is an Observable
 * @deprecated as of 8.0; use rxjs' built-in version
 */
// tslint:disable-next-line:no-any
export function isObservable(obj: any | Observable<any>): obj is Observable<any> {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  if (Symbol.observable && Symbol.observable in obj) {
    return true;
  }

  return typeof obj.subscribe === 'function';
}
