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
    fileTimestamps: Map<string, number | { timestamp: number } | null>,
    buildTimestamp: number,
  ): Set<string> {
    const changedFiles = new Set<string>();
    for (const [file, timeOrEntry] of fileTimestamps) {
      const time =
        timeOrEntry && (typeof timeOrEntry === 'number' ? timeOrEntry : timeOrEntry.timestamp);
      if (time === null || buildTimestamp < time) {
        // Cache stores paths using the POSIX directory separator
        const normalizedFile = normalizePath(file);
        this.delete(normalizedFile);
        changedFiles.add(normalizedFile);
      }
    }

    return changedFiles;
  }
}
