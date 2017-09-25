/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/empty';
import { Logger, LoggerApi } from './logger';


export class NullLogger extends Logger {
  constructor(parent: Logger | null = null) {
    super('', parent);
    this._observable = Observable.empty();
  }

  asApi(): LoggerApi {
    return {
      createChild: () => new NullLogger(this),
      log() {},
      debug() {},
      info() {},
      warn() {},
      error() {},
      fatal() {},
    } as LoggerApi;
  }
}
