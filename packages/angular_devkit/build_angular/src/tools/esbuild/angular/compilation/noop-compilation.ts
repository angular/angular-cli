/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type ng from '@angular/compiler-cli';
import ts from 'typescript';
import { AngularHostOptions } from '../angular-host';
import { AngularCompilation } from './angular-compilation';

export class NoopCompilation extends AngularCompilation {
  async initialize(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionsTransformer?: (compilerOptions: ng.CompilerOptions) => ng.CompilerOptions,
  ): Promise<{
    affectedFiles: ReadonlySet<ts.SourceFile>;
    compilerOptions: ng.CompilerOptions;
    referencedFiles: readonly string[];
  }> {
    // Load the compiler configuration and transform as needed
    const { options: originalCompilerOptions } = await this.loadConfiguration(tsconfig);
    const compilerOptions =
      compilerOptionsTransformer?.(originalCompilerOptions) ?? originalCompilerOptions;

    return { affectedFiles: new Set(), compilerOptions, referencedFiles: [] };
  }

  collectDiagnostics(): never {
    throw new Error('Not available when using noop compilation.');
  }

  emitAffectedFiles(): never {
    throw new Error('Not available when using noop compilation.');
  }
}
