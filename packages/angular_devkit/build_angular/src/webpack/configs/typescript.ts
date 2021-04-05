/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { buildOptimizerLoaderPath } from '@angular-devkit/build-optimizer';
import { getSystemPath } from '@angular-devkit/core';
import { CompilerOptions } from '@angular/compiler-cli';
import { AngularWebpackLoaderPath, AngularWebpackPlugin } from '@ngtools/webpack';
import { WebpackConfigOptions } from '../../utils/build-options';

function ensureIvy(wco: WebpackConfigOptions): void {
  if (wco.tsConfig.options.enableIvy !== false) {
    return;
  }

  wco.logger.warn(
    'Project is attempting to disable the Ivy compiler. ' +
      'Angular versions 12 and higher do not support the deprecated View Engine compiler for applications. ' +
      'The Ivy compiler will be used to build this project. ' +
      '\nFor additional information or if the build fails, please see https://angular.io/guide/ivy',
  );

  wco.tsConfig.options.enableIvy = true;
}

function createIvyPlugin(
  wco: WebpackConfigOptions,
  aot: boolean,
  tsconfig: string,
): AngularWebpackPlugin {
  const { buildOptions } = wco;
  const optimize = buildOptions.optimization.scripts;

  const compilerOptions: CompilerOptions = {
    sourceMap: buildOptions.sourceMap.scripts,
    declaration: false,
    declarationMap: false,
  };

  if (buildOptions.preserveSymlinks !== undefined) {
    compilerOptions.preserveSymlinks = buildOptions.preserveSymlinks;
  }

  const fileReplacements: Record<string, string> = {};
  if (buildOptions.fileReplacements) {
    for (const replacement of buildOptions.fileReplacements) {
      fileReplacements[getSystemPath(replacement.replace)] = getSystemPath(replacement.with);
    }
  }

  return new AngularWebpackPlugin({
    tsconfig,
    compilerOptions,
    fileReplacements,
    jitMode: !aot,
    emitNgModuleScope: !optimize,
  });
}

export function getNonAotConfig(wco: WebpackConfigOptions) {
  const { tsConfigPath } = wco;

  return {
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          loader: AngularWebpackLoaderPath,
        },
      ],
    },
    plugins: [
      createIvyPlugin(wco, false, tsConfigPath),
    ],
  };
}

export function getAotConfig(wco: WebpackConfigOptions) {
  const { tsConfigPath, buildOptions } = wco;

  ensureIvy(wco);

  return {
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            ...(buildOptions.buildOptimizer
              ? [
                  {
                    loader: buildOptimizerLoaderPath,
                    options: { sourceMap: buildOptions.sourceMap.scripts },
                  },
                ]
              : []),
            AngularWebpackLoaderPath,
          ],
        },
        // "allowJs" support with ivy plugin - ensures build optimizer is not run twice
        {
          test: /\.jsx?$/,
          use: [AngularWebpackLoaderPath],
        },
      ],
    },
    plugins: [
      createIvyPlugin(wco, true, tsConfigPath),
    ],
  };
}

export function getTypescriptWorkerPlugin(wco: WebpackConfigOptions, workerTsConfigPath: string) {
  return createIvyPlugin(wco, false, workerTsConfigPath);
}
