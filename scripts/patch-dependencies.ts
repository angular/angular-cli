/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';

const PATCH_LOCK = 'node_modules/rxjs/.patched';

export default function () {
  if (!existsSync(PATCH_LOCK)) {
    execSync('patch -p0 -i scripts/patches/rxjs-ts27.patch');
    execSync('patch -p0 -i scripts/patches/rxjs-typings.patch');
    writeFileSync(PATCH_LOCK, '');
  }
}
