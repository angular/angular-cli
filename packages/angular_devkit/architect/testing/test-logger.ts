/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';


/**
 * @deprecated
 */
export class TestLogger extends logging.Logger {
  private _latestEntries: logging.LogEntry[] = [];
  constructor(name: string, parent: logging.Logger | null = null) {
    super(name, parent);
    this.subscribe((entry) => this._latestEntries.push(entry));
  }

  clear() {
    this._latestEntries = [];
  }

  includes(message: string) {
    return this._latestEntries.some((entry) => entry.message.includes(message));
  }

  test(re: RegExp) {
    return this._latestEntries.some((entry) => re.test(entry.message));
  }
}
