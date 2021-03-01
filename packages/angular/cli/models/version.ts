/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// Same structure as used in framework packages
export class Version {
  public readonly major: string;
  public readonly minor: string;
  public readonly patch: string;

  constructor(public readonly full: string) {
    this.major = full.split('.')[0];
    this.minor = full.split('.')[1];
    this.patch = full.split('.').slice(2).join('.');
  }
}

export const VERSION = new Version(require('../package.json').version);
