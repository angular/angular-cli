/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ng from '@angular/compiler-cli';
import type { PartialMessage } from 'esbuild';
import { profileSync } from '../../esbuild/profiling';
import type { AngularHostOptions } from '../angular-host';

export interface EmitFileResult {
  filename: string;
  contents: string;
  dependencies?: readonly string[];
}

export interface FileTransformResult {
  contents: string;
  watchFiles?: readonly string[];
}

export interface AngularCompilationOptions {
  allowJs?: boolean;
  isolatedModules?: boolean;
  sourceMap?: boolean;
  inlineSourceMap?: boolean;
  _useTypeScriptTranspilation?: boolean;
  [key: string]: unknown;
}

export interface AngularCompilationResult {
  compilerOptions: AngularCompilationOptions;
  referencedFiles: readonly string[];
  externalStylesheets?: ReadonlyMap<string, string>;
  templateUpdates?: ReadonlyMap<string, string>;
  componentResourcesDependencies?: ReadonlyMap<string, readonly string[]>;
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

  static async loadCompilerCli(): Promise<typeof ng> {
    AngularCompilation.#angularCompilerCliModule ??= await import('@angular/compiler-cli');

    return AngularCompilation.#angularCompilerCliModule;
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
        // Disable removing of comments as TS is quite aggressive with these and can
        // remove important annotations, such as /* @__PURE__ */ and comments like /* vite-ignore */.
        removeComments: false,
      }),
    );
  }

  abstract initialize(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionsTransformer?: (compilerOptions: ng.CompilerOptions) => ng.CompilerOptions,
  ): Promise<AngularCompilationResult>;

  emitAffectedFiles(): Iterable<EmitFileResult> | Promise<Iterable<EmitFileResult>> {
    return [];
  }

  transformFile?(filename: string, content: string): Promise<FileTransformResult | null>;

  async diagnoseFiles(
    modes?: DiagnosticModes,
  ): Promise<{ errors?: PartialMessage[]; warnings?: PartialMessage[] }> {
    return {};
  }

  update?(files: Set<string>): Promise<void>;

  close?(): Promise<void>;
}
