/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';

/**
 * @deprecated Please use a Host directly instead of this class. This will be removed prior to 1.0.
 */
export class FileSystemHost extends virtualFs.ScopedHost<{}> {
  constructor(dir: string) {
    super(new NodeJsSyncHost(), normalize(dir));
  }
}
