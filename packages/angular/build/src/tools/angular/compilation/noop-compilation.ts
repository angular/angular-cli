/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ng from '@angular/compiler-cli';
import { AngularHostOptions } from '../angular-host';
import { AngularCompilation, AngularCompilationResult } from './angular-compilation';

export class NoopCompilation extends AngularCompilation {
  async initialize(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionsTransformer?: (compilerOptions: ng.CompilerOptions) => ng.CompilerOptions,
  ): Promise<AngularCompilationResult> {
    // Load the compiler configuration and transform as needed
    const { options: originalCompilerOptions } = await this.loadConfiguration(tsconfig);
    const compilerOptions =
      compilerOptionsTransformer?.(originalCompilerOptions) ?? originalCompilerOptions;

    return { compilerOptions, referencedFiles: [] };
  }

  override emitAffectedFiles(): never {
    throw new Error('Not available when using noop compilation.');
  }
}
