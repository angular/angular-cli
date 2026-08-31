/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ng from '@angular/compiler-cli';
import type { PartialMessage } from 'esbuild';
import ts from 'typescript';
import { toPosixPath } from '../../../utils/path';
import { profileAsync, profileSync } from '../../esbuild/profiling';
import { AngularCompilation, DiagnosticModes } from './angular-compilation';
import { convertTypeScriptDiagnostic } from './diagnostics';

export abstract class TypeScriptCompilation extends AngularCompilation {
  static #angularCompilerCliModule?: typeof ng;

  static async loadCompilerCli(): Promise<typeof ng> {
    TypeScriptCompilation.#angularCompilerCliModule ??= await import('@angular/compiler-cli');

    return TypeScriptCompilation.#angularCompilerCliModule;
  }

  protected async loadConfiguration(tsconfig: string): Promise<ng.ParsedConfiguration> {
    const { readConfiguration } = await TypeScriptCompilation.loadCompilerCli();

    return profileSync('NG_READ_CONFIG', () =>
      readConfiguration(tsconfig, {
        // Angular specific configuration defaults and overrides to ensure a functioning compilation.
        suppressOutputPathCheck: true,
        outDir: undefined,
        sourceMap: false,
        declaration: false,
        declarationMap: false,
        allowEmptyCodegenFiles: false,
        annotationsAs: 'decorators',
        enableResourceInlining: false,
        supportTestBed: false,
        supportJitMode: false,
        // Disable removing of comments as TS is quite aggressive with these and can
        // remove important annotations, such as /* @__PURE__ */ and comments like /* vite-ignore */.
        removeComments: false,
      }),
    );
  }

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
