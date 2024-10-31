/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { platform } from 'node:os';
import * as path from 'node:path';
import type ts from 'typescript';
import { MemoryLoadResultCache } from '../load-result-cache';

const USING_WINDOWS = platform() === 'win32';
const WINDOWS_SEP_REGEXP = new RegExp(`\\${path.win32.sep}`, 'g');

export class SourceFileCache extends Map<string, ts.SourceFile> {
  readonly modifiedFiles = new Set<string>();
  readonly typeScriptFileCache = new Map<string, string | Uint8Array>();
  readonly loadResultCache = new MemoryLoadResultCache();

  referencedFiles?: readonly string[];

  constructor(readonly persistentCachePath?: string) {
    super();
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

      // Normalize separators to allow matching TypeScript Host paths
      if (USING_WINDOWS) {
        file = file.replace(WINDOWS_SEP_REGEXP, path.posix.sep);
      }

      invalid = this.delete(file) || invalid;
      this.modifiedFiles.add(file);

      invalid = extraWatchFiles.has(file) || invalid;
    }

    return invalid;
  }
}
