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

  invalidate(file: string): void {
    const sourceFile = this.get(file);
    if (sourceFile) {
      this.delete(file);
      this.angularDiagnostics.delete(sourceFile);
    }
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
