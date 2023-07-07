/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { BuildOptions } from 'esbuild';
import assert from 'node:assert';
import path from 'node:path';
import type { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { allowMangle } from '../../utils/environment-options';
import { SourceFileCache, createCompilerPlugin } from './angular/compiler-plugin';
import { createCompilerPluginOptions } from './compiler-plugin-options';
import { createExternalPackagesPlugin } from './external-packages-plugin';
import { createRxjsEsmResolutionPlugin } from './rxjs-esm-resolution-plugin';
import { createSourcemapIngorelistPlugin } from './sourcemap-ignorelist-plugin';
import { getFeatureSupport } from './utils';
import { createVirtualModulePlugin } from './virtual-module-plugin';

export function createBrowserCodeBundleOptions(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  sourceFileCache?: SourceFileCache,
): BuildOptions {
  const { workspaceRoot, entryPoints, outputNames, jit } = options;

  const { pluginOptions, styleOptions } = createCompilerPluginOptions(
    options,
    target,
    sourceFileCache,
  );

  const buildOptions: BuildOptions = {
    ...getEsBuildCommonOptions(options),
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

/**
 * Create an esbuild 'build' options object for the server bundle.
 * @param options The builder's user-provider normalized options.
 * @returns An esbuild BuildOptions object.
 */
export function createServerCodeBundleOptions(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  sourceFileCache: SourceFileCache,
): BuildOptions {
  const { jit, serverEntryPoint, workspaceRoot } = options;

  assert(
    serverEntryPoint,
    'createServerCodeBundleOptions should not be called without a defined serverEntryPoint.',
  );

  const { pluginOptions, styleOptions } = createCompilerPluginOptions(
    options,
    target,
    sourceFileCache,
  );

  const namespace = 'angular:server-entry';

  const buildOptions: BuildOptions = {
    ...getEsBuildCommonOptions(options),
    platform: 'node',
    outExtension: { '.js': '.mjs' },
    // Note: `es2015` is needed for RxJS v6. If not specified, `module` would
    // match and the ES5 distribution would be bundled and ends up breaking at
    // runtime with the RxJS testing library.
    // More details: https://github.com/angular/angular-cli/issues/25405.
    mainFields: ['es2020', 'es2015', 'module', 'main'],
    entryNames: '[name]',
    target,
    banner: {
      // Note: Needed as esbuild does not provide require shims / proxy from ESModules.
      // See: https://github.com/evanw/esbuild/issues/1921.
      js: [
        `import { createRequire } from 'node:module';`,
        `globalThis['require'] ??= createRequire(import.meta.url);`,
      ].join('\n'),
    },
    entryPoints: {
      'server': namespace,
    },
    supported: getFeatureSupport(target),
    plugins: [
      createSourcemapIngorelistPlugin(),
      createCompilerPlugin(
        // JS/TS options
        { ...pluginOptions, noopTypeScriptCompilation: true },
        // Component stylesheet options
        styleOptions,
      ),
      createVirtualModulePlugin({
        namespace,
        loadContent: () => {
          const mainServerEntryPoint = path
            .relative(workspaceRoot, serverEntryPoint)
            .replace(/\\/g, '/');
          const importAndExportDec: string[] = [
            `import '@angular/platform-server/init';`,
            `import moduleOrBootstrapFn from './${mainServerEntryPoint}';`,
            `export default moduleOrBootstrapFn;`,
            `export { renderApplication, renderModule, ɵSERVER_CONTEXT } from '@angular/platform-server';`,
          ];

          if (jit) {
            importAndExportDec.unshift(`import '@angular/compiler';`);
          }

          return {
            contents: importAndExportDec.join('\n'),
            loader: 'js',
            resolveDir: workspaceRoot,
          };
        },
      }),
    ],
  };

  buildOptions.plugins ??= [];
  if (options.externalPackages) {
    buildOptions.plugins.push(createExternalPackagesPlugin());
  } else {
    buildOptions.plugins.push(createRxjsEsmResolutionPlugin());
  }

  return buildOptions;
}

function getEsBuildCommonOptions(options: NormalizedApplicationBuildOptions): BuildOptions {
  const {
    workspaceRoot,
    outExtension,
    optimizationOptions,
    sourcemapOptions,
    tsconfig,
    externalDependencies,
    outputNames,
    preserveSymlinks,
    jit,
  } = options;

  return {
    absWorkingDir: workspaceRoot,
    bundle: true,
    format: 'esm',
    assetNames: outputNames.media,
    conditions: ['es2020', 'es2015', 'module'],
    resolveExtensions: ['.ts', '.tsx', '.mjs', '.js'],
    metafile: true,
    legalComments: options.extractLicenses ? 'none' : 'eof',
    logLevel: options.verbose ? 'debug' : 'silent',
    minifyIdentifiers: optimizationOptions.scripts && allowMangle,
    minifySyntax: optimizationOptions.scripts,
    minifyWhitespace: optimizationOptions.scripts,
    pure: ['forwardRef'],
    outdir: workspaceRoot,
    outExtension: outExtension ? { '.js': `.${outExtension}` } : undefined,
    sourcemap: sourcemapOptions.scripts && (sourcemapOptions.hidden ? 'external' : true),
    splitting: true,
    tsconfig,
    external: externalDependencies,
    write: false,
    preserveSymlinks,
    define: {
      // Only set to false when script optimizations are enabled. It should not be set to true because
      // Angular turns `ngDevMode` into an object for development debugging purposes when not defined
      // which a constant true value would break.
      ...(optimizationOptions.scripts ? { 'ngDevMode': 'false' } : undefined),
      'ngJitMode': jit ? 'true' : 'false',
    },
  };
}
