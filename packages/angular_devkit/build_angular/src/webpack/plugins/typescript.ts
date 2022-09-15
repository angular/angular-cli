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

  if (tsConfig.options.target === undefined || tsConfig.options.target <= ScriptTarget.ES5) {
    throw new Error(
      'ES output older than ES2015 is not supported. Please update TypeScript "target" compiler option to ES2015 or later.',
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
