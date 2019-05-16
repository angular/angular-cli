/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs';
import { LogEntry, Logger } from './logger';


export class TransformLogger extends Logger {
  constructor(name: string,
              transform: (stream: Observable<LogEntry>) => Observable<LogEntry>,
              parent: Logger | null = null) {
    super(name, parent);
    this._observable = transform(this._observable);
  }
}
