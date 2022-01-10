/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

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

// TODO: Convert this to use build-time version stamping after flipping the build script to use bazel
// export const VERSION = new Version('0.0.0-PLACEHOLDER');
export const VERSION = new Version(
  (
    JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8')) as { version: string }
  ).version,
);
