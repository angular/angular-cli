/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as findCacheDirectory from 'find-cache-dir';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { cachingBasePath } from './environment-options';

export function findCachePath(name: string): string {
  if (cachingBasePath) {
    return resolve(cachingBasePath, name);
  }

  return findCacheDirectory({ name }) || tmpdir();
}
