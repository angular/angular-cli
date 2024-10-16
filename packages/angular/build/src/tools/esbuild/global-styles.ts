/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { BundlerOptionsFactory } from './bundler-context';
import { createStylesheetBundleOptions } from './stylesheets/bundle-options';
import { createVirtualModulePlugin } from './virtual-module-plugin';

export function createGlobalStylesBundleOptions(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  initial: boolean,
): BundlerOptionsFactory | undefined {
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
    postcssConfiguration,
    cacheOptions,
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

  return (loadCache) => {
    const buildOptions = createStylesheetBundleOptions(
      {
        workspaceRoot,
        optimization: !!optimizationOptions.styles.minify,
        inlineFonts: !!optimizationOptions.fonts.inline,
        sourcemap: !!sourcemapOptions.styles && (sourcemapOptions.hidden ? 'external' : true),
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
        // string[] | undefined' is not assignable to type '(Version | DeprecationOrId)[] | undefined'.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sass: stylePreprocessorOptions?.sass as any,
        tailwindConfiguration,
        postcssConfiguration,
        cacheOptions,
      },
      loadCache,
    );

    // Keep special CSS comments `/*! comment */` in place when `removeSpecialComments` is disabled.
    // These comments are special for a number of CSS tools such as Critters and PurgeCSS.
    buildOptions.legalComments = optimizationOptions.styles?.removeSpecialComments
      ? 'none'
      : 'inline';

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
  };
}
