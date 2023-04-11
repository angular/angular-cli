/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type ng from '@angular/compiler-cli';
import type ts from 'typescript';
import { loadEsmModule } from '../../../utils/load-esm';
import type { AngularHostOptions } from './angular-host';

export interface EmitFileResult {
  content?: string;
  map?: string;
  dependencies: readonly string[];
}

export type FileEmitter = (file: string) => Promise<EmitFileResult | undefined>;

export abstract class AngularCompilation {
  static #angularCompilerCliModule?: typeof ng;

  static async loadCompilerCli(): Promise<typeof ng> {
    // This uses a wrapped dynamic import to load `@angular/compiler-cli` which is ESM.
    // Once TypeScript provides support for retaining dynamic imports this workaround can be dropped.
    AngularCompilation.#angularCompilerCliModule ??= await loadEsmModule<typeof ng>(
      '@angular/compiler-cli',
    );

    return AngularCompilation.#angularCompilerCliModule;
  }

  abstract initialize(
    rootNames: string[],
    compilerOptions: ts.CompilerOptions,
    hostOptions: AngularHostOptions,
    configurationDiagnostics?: ts.Diagnostic[],
  ): Promise<{ affectedFiles: ReadonlySet<ts.SourceFile> }>;

  abstract collectDiagnostics(): Iterable<ts.Diagnostic>;

  abstract createFileEmitter(onAfterEmit?: (sourceFile: ts.SourceFile) => void): FileEmitter;
}
