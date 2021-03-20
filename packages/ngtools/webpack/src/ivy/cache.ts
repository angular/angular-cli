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
  private readonly angularDiagnostics = new Map<ts.SourceFile, ts.Diagnostic[]>();

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
        const sourceFile = this.get(normalizedFile);
        if (sourceFile) {
          this.delete(normalizedFile);
          this.angularDiagnostics.delete(sourceFile);
        }
        changedFiles.add(normalizedFile);
      }
    }

    return changedFiles;
  }

  updateAngularDiagnostics(sourceFile: ts.SourceFile, diagnostics: ts.Diagnostic[]): void {
    if (diagnostics.length > 0) {
      this.angularDiagnostics.set(sourceFile, diagnostics);
    } else {
      this.angularDiagnostics.delete(sourceFile);
    }
  }

  getAngularDiagnostics(sourceFile: ts.SourceFile): ts.Diagnostic[] | undefined {
    return this.angularDiagnostics.get(sourceFile);
  }
}
