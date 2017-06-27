/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Logger} from './logger';

import {Observable} from 'rxjs/Observable';

import 'rxjs/add/observable/empty';


export class NullLogger extends Logger {
  constructor(parent: Logger | null = null) {
    super('', parent);
    this._observable = Observable.empty();
  }
}
