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
import { SourceFileCache, createCompilerPlugin } from './angular/compiler-plugin';
import { createCompilerPluginOptions } from './compiler-plugin';
import { createExternalPackagesPlugin } from './external-packages-plugin';
import { createSourcemapIngorelistPlugin } from './sourcemap-ignorelist-plugin';
import { getEsBuildCommonOptions, getFeatureSupport } from './utils';
import { createVirtualModulePlugin } from './virtual-module-plugin';

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
          const importAndExportDec: string[] = [
            `import '@angular/platform-server/init';`,
            `import './${path.relative(workspaceRoot, serverEntryPoint).replace(/\\/g, '/')}';`,
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

  if (options.externalPackages) {
    buildOptions.plugins ??= [];
    buildOptions.plugins.push(createExternalPackagesPlugin());
  }

  return buildOptions;
}
