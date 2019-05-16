/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export class NgToolkitError extends Error {
  constructor(message?: string) {
    super();

    if (message) {
      this.message = message;
    } else {
      this.message = this.constructor.name;
    }
  }
}
