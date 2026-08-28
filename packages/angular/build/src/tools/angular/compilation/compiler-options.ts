/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ng from '@angular/compiler-cli';
import type { PartialMessage } from 'esbuild';
import * as path from 'node:path';
import type ts from 'typescript';

export interface CompilerOptionOverrides {
  sourcemap?: boolean;
  preserveSymlinks?: boolean;
  cachePath?: string;
  externalRuntimeStyles?: boolean;
  enableHmr?: boolean;
  instrumentForCoverage?: boolean;
  includeTestMetadata?: boolean;
  customConditions?: string[];
}

export function transformCompilerOptions(
  typeScript: typeof ts,
  baseCompilerOptions: ng.CompilerOptions,
  overrides?: CompilerOptionOverrides,
  tsconfig?: string,
): { compilerOptions: ng.CompilerOptions; warnings: PartialMessage[] } {
  const compilerOptions = { ...baseCompilerOptions };
  const warnings: PartialMessage[] = [];

  if (
    compilerOptions.target === undefined ||
    compilerOptions.target < typeScript.ScriptTarget.ES2022
  ) {
    // If 'useDefineForClassFields' is already defined in the users project leave the value as is.
    // Otherwise fallback to false due to https://github.com/microsoft/TypeScript/issues/45995
    // which breaks the deprecated `@Effects` NGRX decorator and potentially other existing code as well.
    compilerOptions.target = typeScript.ScriptTarget.ES2022;
    compilerOptions.useDefineForClassFields ??= false;

    warnings.push({
      text:
        `TypeScript compiler options 'target' and 'useDefineForClassFields' are set to 'ES2022' and ` +
        `'false' respectively by the Angular CLI.`,
      location: tsconfig ? { file: tsconfig } : null,
      notes: [
        {
          text:
            'To control ECMA version and features use the Browserslist configuration. ' +
            'For more information, see https://angular.dev/tools/cli/build#configuring-browser-compatibility',
        },
      ],
    });
  }

  if (compilerOptions.compilationMode === 'partial') {
    warnings.push({
      text: 'Angular partial compilation mode is not supported when building applications.',
      location: null,
      notes: [{ text: 'Full compilation mode will be used instead.' }],
    });
    compilerOptions.compilationMode = 'full';
  }

  // Enable incremental compilation by default if caching is enabled and incremental is not explicitly disabled
  if (compilerOptions.incremental !== false && overrides?.cachePath) {
    compilerOptions.incremental = true;
    // Set the build info file location to the configured cache directory
    compilerOptions.tsBuildInfoFile = path.join(overrides.cachePath, '.tsbuildinfo');
  } else {
    compilerOptions.incremental = false;
  }

  if (
    compilerOptions.module === undefined ||
    compilerOptions.module < typeScript.ModuleKind.ES2015
  ) {
    compilerOptions.module = typeScript.ModuleKind.ES2022;
    warnings.push({
      text: `TypeScript compiler options 'module' values 'CommonJS', 'UMD', 'System' and 'AMD' are not supported.`,
      location: null,
      notes: [{ text: `The 'module' option will be set to 'ES2022' instead.` }],
    });
  }

  if (compilerOptions.isolatedModules && compilerOptions.emitDecoratorMetadata) {
    warnings.push({
      text: `TypeScript compiler option 'isolatedModules' may prevent the 'emitDecoratorMetadata' option from emitting all metadata.`,
      location: null,
      notes: [
        {
          text:
            `The 'emitDecoratorMetadata' option is not required by Angular` +
            'and can be removed if not explictly required by the project.',
        },
      ],
    });
  }

  // Synchronize custom resolve conditions.
  // Set if using the supported bundler resolution mode (bundler is the default in new projects)
  if (
    compilerOptions.moduleResolution === typeScript.ModuleResolutionKind.Bundler ||
    compilerOptions.module === typeScript.ModuleKind.Preserve
  ) {
    compilerOptions.customConditions = overrides?.customConditions;
  }

  return {
    compilerOptions: {
      ...compilerOptions,
      noEmitOnError: false,
      composite: false,
      inlineSources: !!overrides?.sourcemap,
      inlineSourceMap: !!overrides?.sourcemap,
      sourceMap: undefined,
      mapRoot: undefined,
      sourceRoot: undefined,
      preserveSymlinks: overrides?.preserveSymlinks,
      externalRuntimeStyles: overrides?.externalRuntimeStyles,
      _enableHmr: !!overrides?.enableHmr,
      // TypeScript transpilation is forced if:
      // - isolatedModules is disabled (TS needs full module types to emit JS).
      // - Karma code coverage is active (the coverage instrumentation transformer is Babel-based
      //   and cannot parse raw TypeScript code; Vitest handles coverage instrumentation downstream).
      _useTypeScriptTranspilation:
        !compilerOptions.isolatedModules || !!overrides?.instrumentForCoverage,
      supportTestBed: !!overrides?.includeTestMetadata,
      supportJitMode: !!overrides?.includeTestMetadata,
    },
    warnings,
  };
}
