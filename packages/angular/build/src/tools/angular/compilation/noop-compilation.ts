/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { AngularHostOptions } from '../angular-host';
import { AngularCompilation, AngularCompilationResult } from './angular-compilation';
import type { CompilerOptionOverrides } from './compiler-options';

/**
 * An Angular compilation that performs no actual compilation or code emission.
 * Used for secondary compilation contexts where only the resolved compiler options
 * and configuration state are needed.
 */
export class NoopCompilation extends AngularCompilation {
  async initialize(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionOverrides?: CompilerOptionOverrides,
  ): Promise<AngularCompilationResult> {
    // Load the compiler configuration
    const { options: originalCompilerOptions } = await this.loadConfiguration(tsconfig);
    // Apply relevant overrides directly without invoking `transformCompilerOptions`
    // to avoid loading the `typescript` package on the main thread.
    const compilerOptions = {
      ...originalCompilerOptions,
      noEmitOnError: false,
      composite: false,
      inlineSources: !!compilerOptionOverrides?.sourcemap,
      inlineSourceMap: !!compilerOptionOverrides?.sourcemap,
      sourceMap: undefined,
      mapRoot: undefined,
      sourceRoot: undefined,
      preserveSymlinks: compilerOptionOverrides?.preserveSymlinks,
      externalRuntimeStyles: compilerOptionOverrides?.externalRuntimeStyles,
      _enableHmr: !!compilerOptionOverrides?.enableHmr,
      _useTypeScriptTranspilation:
        !originalCompilerOptions.isolatedModules ||
        !!compilerOptionOverrides?.instrumentForCoverage,
      supportTestBed: !!compilerOptionOverrides?.includeTestMetadata,
      supportJitMode: !!compilerOptionOverrides?.includeTestMetadata,
      customConditions:
        originalCompilerOptions.moduleResolution === 100 /* Bundler */ ||
        originalCompilerOptions.module === 200 /* Preserve */
          ? compilerOptionOverrides?.customConditions
          : originalCompilerOptions.customConditions,
    };

    return { compilerOptions, referencedFiles: [] };
  }

  override emitAffectedFiles(): never {
    throw new Error('Not available when using noop compilation.');
  }
}
