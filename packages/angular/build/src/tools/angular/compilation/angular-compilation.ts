/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type ng from '@angular/compiler-cli';
import type { PartialMessage } from 'esbuild';
import type ts from 'typescript';
import { loadEsmModule } from '../../../utils/load-esm';
import { convertTypeScriptDiagnostic } from '../../esbuild/angular/diagnostics';
import { profileAsync, profileSync } from '../../esbuild/profiling';
import type { AngularHostOptions } from '../angular-host';

export interface EmitFileResult {
  filename: string;
  contents: string;
  dependencies?: readonly string[];
}

export enum DiagnosticModes {
  None = 0,
  Option = 1 << 0,
  Syntactic = 1 << 1,
  Semantic = 1 << 2,
  All = Option | Syntactic | Semantic,
}

export abstract class AngularCompilation {
  static #angularCompilerCliModule?: typeof ng;
  static #typescriptModule?: typeof ts;

  static async loadCompilerCli(): Promise<typeof ng> {
    // This uses a wrapped dynamic import to load `@angular/compiler-cli` which is ESM.
    // Once TypeScript provides support for retaining dynamic imports this workaround can be dropped.
    AngularCompilation.#angularCompilerCliModule ??=
      await loadEsmModule<typeof ng>('@angular/compiler-cli');

    return AngularCompilation.#angularCompilerCliModule;
  }

  static async loadTypescript(): Promise<typeof ts> {
    AngularCompilation.#typescriptModule ??= await import('typescript');

    return AngularCompilation.#typescriptModule;
  }

  protected async loadConfiguration(tsconfig: string): Promise<ng.CompilerOptions> {
    const { readConfiguration } = await AngularCompilation.loadCompilerCli();

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
      }),
    );
  }

  abstract initialize(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionsTransformer?: (compilerOptions: ng.CompilerOptions) => ng.CompilerOptions,
  ): Promise<{
    affectedFiles: ReadonlySet<ts.SourceFile>;
    compilerOptions: ng.CompilerOptions;
    referencedFiles: readonly string[];
    externalStylesheets?: ReadonlyMap<string, string>;
    templateUpdates?: ReadonlyMap<string, string>;
  }>;

  abstract emitAffectedFiles(): Iterable<EmitFileResult> | Promise<Iterable<EmitFileResult>>;

  protected abstract collectDiagnostics(
    modes: DiagnosticModes,
  ): Iterable<ts.Diagnostic> | Promise<Iterable<ts.Diagnostic>>;

  async diagnoseFiles(
    modes = DiagnosticModes.All,
  ): Promise<{ errors?: PartialMessage[]; warnings?: PartialMessage[] }> {
    const result: { errors?: PartialMessage[]; warnings?: PartialMessage[] } = {};

    // Avoid loading typescript until actually needed.
    // This allows for avoiding the load of typescript in the main thread when using the parallel compilation.
    const typescript = await AngularCompilation.loadTypescript();

    await profileAsync('NG_DIAGNOSTICS_TOTAL', async () => {
      for (const diagnostic of await this.collectDiagnostics(modes)) {
        const message = convertTypeScriptDiagnostic(typescript, diagnostic);
        if (diagnostic.category === typescript.DiagnosticCategory.Error) {
          (result.errors ??= []).push(message);
        } else {
          (result.warnings ??= []).push(message);
        }
      }
    });

    return result;
  }

  update?(files: Set<string>): Promise<void>;

  close?(): Promise<void>;
}
