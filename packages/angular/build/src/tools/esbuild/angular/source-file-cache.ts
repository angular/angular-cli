/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as path from 'node:path';
import { MemoryLoadResultCache } from '../load-result-cache';

export class SourceFileCache {
  readonly modifiedFiles = new Set<string>();
  readonly typeScriptFileCache = new Map<string, string | Uint8Array>();
  readonly loadResultCache = new MemoryLoadResultCache();

  referencedFiles?: readonly string[];

  constructor(readonly persistentCachePath?: string) {}

  /**
   * Releases all cached content. The cached data is only needed for incremental
   * rebuilds and can include the emitted contents of every TypeScript file in the
   * program. The cache is repopulated if a build is performed after this is called.
   */
  clear(): void {
    this.modifiedFiles.clear();
    this.typeScriptFileCache.clear();
    this.loadResultCache.clear();
    this.referencedFiles = undefined;
  }

  invalidate(files: Iterable<string>): boolean {
    if (files !== this.modifiedFiles) {
      this.modifiedFiles.clear();
    }

    const extraWatchFiles = new Set(this.referencedFiles?.map(path.normalize));

    let invalid = false;
    for (let file of files) {
      file = path.normalize(file);
      invalid = this.loadResultCache.invalidate(file) || invalid;
      invalid = extraWatchFiles.has(file) || invalid;
      this.modifiedFiles.add(file);
    }

    return invalid;
  }
}
