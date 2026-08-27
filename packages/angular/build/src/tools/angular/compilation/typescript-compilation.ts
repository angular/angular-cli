/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { PartialMessage } from 'esbuild';
import ts from 'typescript';
import { toPosixPath } from '../../../utils/path';
import { profileAsync } from '../../esbuild/profiling';
import { AngularCompilation, DiagnosticModes } from './angular-compilation';
import { convertTypeScriptDiagnostic } from './diagnostics';

export abstract class TypeScriptCompilation extends AngularCompilation {
  protected readonly sourceFiles = new Map<string, ts.SourceFile>();

  protected invalidateFiles(files: Iterable<string>): void {
    for (const file of files) {
      this.sourceFiles.delete(toPosixPath(file));
    }
  }

  override async update(files: Set<string>): Promise<void> {
    this.invalidateFiles(files);
  }

  protected abstract collectDiagnostics(
    modes: DiagnosticModes,
  ): Iterable<ts.Diagnostic> | Promise<Iterable<ts.Diagnostic>>;

  override async diagnoseFiles(
    modes = DiagnosticModes.All,
  ): Promise<{ errors?: PartialMessage[]; warnings?: PartialMessage[] }> {
    if (modes === DiagnosticModes.None) {
      return {};
    }

    const result: { errors?: PartialMessage[]; warnings?: PartialMessage[] } = {};

    await profileAsync('NG_DIAGNOSTICS_TOTAL', async () => {
      const diagnostics = await this.collectDiagnostics(modes);

      for (const diagnostic of diagnostics) {
        const message = convertTypeScriptDiagnostic(ts, diagnostic);
        if (diagnostic.category === ts.DiagnosticCategory.Error) {
          (result.errors ??= []).push(message);
        } else {
          (result.warnings ??= []).push(message);
        }
      }
    });

    return result;
  }
}
