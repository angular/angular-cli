/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { CompilerOptions } from '@angular/compiler-cli';
import { AngularWebpackPlugin } from '@ngtools/webpack';
import { ScriptTarget } from 'typescript';
import { WebpackConfigOptions } from '../../utils/build-options';

export function createIvyPlugin(
  wco: WebpackConfigOptions,
  aot: boolean,
  tsconfig: string,
): AngularWebpackPlugin {
  const { buildOptions, tsConfig } = wco;
  const optimize = buildOptions.optimization.scripts;

  const compilerOptions: CompilerOptions = {
    sourceMap: buildOptions.sourceMap.scripts,
    declaration: false,
    declarationMap: false,
  };

  if (tsConfig.options.target === undefined || tsConfig.options.target < ScriptTarget.ES2022) {
    tsConfig.options.target = ScriptTarget.ES2022;
    // If 'useDefineForClassFields' is already defined in the users project leave the value as is.
    // Otherwise fallback to false due to https://github.com/microsoft/TypeScript/issues/45995
    // which breaks the deprecated `@Effects` NGRX decorator and potentially other existing code as well.
    tsConfig.options.useDefineForClassFields ??= false;

    wco.logger.warn(
      'TypeScript compiler options "target" and "useDefineForClassFields" are set to "ES2022" and ' +
        '"false" respectively by the Angular CLI. To control ECMA version and features use the Browerslist configuration. ' +
        'For more information, see https://angular.io/guide/build#configuring-browser-compatibility',
    );
  }

  if (buildOptions.preserveSymlinks !== undefined) {
    compilerOptions.preserveSymlinks = buildOptions.preserveSymlinks;
  }

  const fileReplacements: Record<string, string> = {};
  if (buildOptions.fileReplacements) {
    for (const replacement of buildOptions.fileReplacements) {
      fileReplacements[replacement.replace] = replacement.with;
    }
  }

  return new AngularWebpackPlugin({
    tsconfig,
    compilerOptions,
    fileReplacements,
    jitMode: !aot,
    emitNgModuleScope: !optimize,
    inlineStyleFileExtension: buildOptions.inlineStyleLanguage ?? 'css',
  });
}
