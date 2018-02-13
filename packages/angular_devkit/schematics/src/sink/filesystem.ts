/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { HostSink } from './host';

/**
 * @deprecated Use the new virtualFs.Host classes from @angular-devkit/core.
 */
export class FileSystemSink extends HostSink {
  constructor(dir: string, force = false) {
    super(new virtualFs.ScopedHost(new NodeJsSyncHost(), normalize(dir)), force);
  }
}
