/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { normalizePath } from './paths';

export class SourceFileCache extends Map<string, ts.SourceFile> {
  invalidate(
    fileTimestamps: Map<string, 'ignore' | number | { safeTime: number } | null>,
    buildTimestamp: number,
  ): Set<string> {
    const changedFiles = new Set<string>();
    for (const [file, timeOrEntry] of fileTimestamps) {
      if (timeOrEntry === 'ignore') {
        continue;
      }

      let time;
      if (typeof timeOrEntry === 'number') {
        time = timeOrEntry;
      } else if (timeOrEntry) {
        time = timeOrEntry.safeTime;
      }

      if (!time || time >= buildTimestamp) {
        // Cache stores paths using the POSIX directory separator
        const normalizedFile = normalizePath(file);
        this.delete(normalizedFile);
        changedFiles.add(normalizedFile);
      }
    }

    return changedFiles;
  }
}
