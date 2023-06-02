/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { BuildOptions } from 'esbuild';
import assert from 'node:assert';
import { LoadResultCache } from './load-result-cache';
import { NormalizedBrowserOptions } from './options';
import { createStylesheetBundleOptions } from './stylesheets/bundle-options';
import { createVirtualModulePlugin } from './virtual-module-plugin';

export function createGlobalStylesBundleOptions(
  options: NormalizedBrowserOptions,
  target: string[],
  browsers: string[],
  initial: boolean,
  cache?: LoadResultCache,
): BuildOptions | undefined {
  const {
    workspaceRoot,
    optimizationOptions,
    sourcemapOptions,
    outputNames,
    globalStyles,
    preserveSymlinks,
    externalDependencies,
    stylePreprocessorOptions,
    tailwindConfiguration,
  } = options;

  const namespace = 'angular:styles/global';
  const entryPoints: Record<string, string> = {};
  let found = false;
  for (const style of globalStyles) {
    if (style.initial === initial) {
      found = true;
      entryPoints[style.name] = `${namespace};${style.name}`;
    }
  }

  // Skip if there are no entry points for the style loading type
  if (found === false) {
    return;
  }

  const buildOptions = createStylesheetBundleOptions(
    {
      workspaceRoot,
      optimization: !!optimizationOptions.styles.minify,
      sourcemap: !!sourcemapOptions.styles,
      preserveSymlinks,
      target,
      externalDependencies,
      outputNames: initial
        ? outputNames
        : {
            ...outputNames,
            bundles: '[name]',
          },
      includePaths: stylePreprocessorOptions?.includePaths,
      browsers,
      tailwindConfiguration,
    },
    cache,
  );
  buildOptions.legalComments = options.extractLicenses ? 'none' : 'eof';
  buildOptions.entryPoints = entryPoints;

  buildOptions.plugins.unshift(
    createVirtualModulePlugin({
      namespace,
      transformPath: (path) => path.split(';', 2)[1],
      loadContent: (args) => {
        const files = globalStyles.find(({ name }) => name === args.path)?.files;
        assert(files, `global style name should always be found [${args.path}]`);

        return {
          contents: files.map((file) => `@import '${file.replace(/\\/g, '/')}';`).join('\n'),
          loader: 'css',
          resolveDir: workspaceRoot,
        };
      },
    }),
  );

  return buildOptions;
}
