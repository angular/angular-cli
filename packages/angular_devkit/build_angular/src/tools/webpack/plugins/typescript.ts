/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { CompilerOptions } from '@angular/compiler-cli';
import { AngularWebpackPlugin } from '@ngtools/webpack';
import { ScriptTarget } from 'typescript';
import { WebpackConfigOptions } from '../../../utils/build-options';

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
    // Disable removing of comments as TS is quite aggressive with these and can
    // remove important annotations, such as /* @__PURE__ */.
    removeComments: false,
  };

  if (tsConfig.options.target === undefined || tsConfig.options.target < ScriptTarget.ES2022) {
    compilerOptions.target = ScriptTarget.ES2022;
    // If 'useDefineForClassFields' is already defined in the users project leave the value as is.
    // Otherwise fallback to false due to https://github.com/microsoft/TypeScript/issues/45995
    // which breaks the deprecated `@Effects` NGRX decorator and potentially other existing code as well.
    compilerOptions.useDefineForClassFields ??= false;

    wco.logger.warn(
      'TypeScript compiler options "target" and "useDefineForClassFields" are set to "ES2022" and ' +
        '"false" respectively by the Angular CLI. To control ECMA version and features use the Browserslist configuration. ' +
        'For more information, see https://angular.dev/tools/cli/build#configuring-browser-compatibility\n' +
        `NOTE: You can set the "target" to "ES2022" in the project's tsconfig to remove this warning.`,
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
