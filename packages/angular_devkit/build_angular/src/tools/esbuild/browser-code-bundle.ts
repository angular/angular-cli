/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { BuildOptions } from 'esbuild';
import type { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { SourceFileCache, createCompilerPlugin } from './angular/compiler-plugin';
import { createCompilerPluginOptions } from './compiler-plugin';
import { createExternalPackagesPlugin } from './external-packages-plugin';
import { createSourcemapIngorelistPlugin } from './sourcemap-ignorelist-plugin';
import {
  getEsBuildCommonOptions as getEsBuildCodeBundleCommonOptions,
  getFeatureSupport,
} from './utils';
import { createVirtualModulePlugin } from './virtual-module-plugin';

export function createBrowserCodeBundleOptions(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  browsers: string[],
  sourceFileCache?: SourceFileCache,
): BuildOptions {
  const { workspaceRoot, entryPoints, outputNames, jit } = options;

  const { pluginOptions, styleOptions } = createCompilerPluginOptions(
    options,
    target,
    browsers,
    sourceFileCache,
  );

  const buildOptions: BuildOptions = {
    ...getEsBuildCodeBundleCommonOptions(options),
    platform: 'browser',
    // Note: `es2015` is needed for RxJS v6. If not specified, `module` would
    // match and the ES5 distribution would be bundled and ends up breaking at
    // runtime with the RxJS testing library.
    // More details: https://github.com/angular/angular-cli/issues/25405.
    mainFields: ['es2020', 'es2015', 'browser', 'module', 'main'],
    entryNames: outputNames.bundles,
    entryPoints,
    target,
    supported: getFeatureSupport(target),
    plugins: [
      createSourcemapIngorelistPlugin(),
      createCompilerPlugin(
        // JS/TS options
        pluginOptions,
        // Component stylesheet options
        styleOptions,
      ),
    ],
  };

  if (options.externalPackages) {
    buildOptions.plugins ??= [];
    buildOptions.plugins.push(createExternalPackagesPlugin());
  }

  const polyfills = options.polyfills ? [...options.polyfills] : [];
  if (jit) {
    polyfills.push('@angular/compiler');
  }

  if (polyfills?.length) {
    const namespace = 'angular:polyfills';
    buildOptions.entryPoints = {
      ...buildOptions.entryPoints,
      'polyfills': namespace,
    };

    buildOptions.plugins?.unshift(
      createVirtualModulePlugin({
        namespace,
        loadContent: () => ({
          contents: polyfills.map((file) => `import '${file.replace(/\\/g, '/')}';`).join('\n'),
          loader: 'js',
          resolveDir: workspaceRoot,
        }),
      }),
    );
  }

  return buildOptions;
}
