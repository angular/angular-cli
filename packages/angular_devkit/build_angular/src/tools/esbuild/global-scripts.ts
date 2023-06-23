/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { BuildOptions } from 'esbuild';
import MagicString, { Bundle } from 'magic-string';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { assertIsError } from '../../utils/error';
import { LoadResultCache, createCachedLoad } from './load-result-cache';
import { createSourcemapIngorelistPlugin } from './sourcemap-ignorelist-plugin';
import { createVirtualModulePlugin } from './virtual-module-plugin';

/**
 * Create an esbuild 'build' options object for all global scripts defined in the user provied
 * build options.
 * @param options The builder's user-provider normalized options.
 * @returns An esbuild BuildOptions object.
 */
export function createGlobalScriptsBundleOptions(
  options: NormalizedApplicationBuildOptions,
  initial: boolean,
  loadCache?: LoadResultCache,
): BuildOptions | undefined {
  const {
    globalScripts,
    optimizationOptions,
    outputNames,
    preserveSymlinks,
    sourcemapOptions,
    workspaceRoot,
  } = options;

  const namespace = 'angular:script/global';
  const entryPoints: Record<string, string> = {};
  let found = false;
  for (const script of globalScripts) {
    if (script.initial === initial) {
      found = true;
      entryPoints[script.name] = `${namespace}:${script.name}`;
    }
  }

  // Skip if there are no entry points for the style loading type
  if (found === false) {
    return;
  }

  return {
    absWorkingDir: workspaceRoot,
    bundle: false,
    splitting: false,
    entryPoints,
    entryNames: initial ? outputNames.bundles : '[name]',
    assetNames: outputNames.media,
    mainFields: ['script', 'browser', 'main'],
    conditions: ['script'],
    resolveExtensions: ['.mjs', '.js'],
    logLevel: options.verbose ? 'debug' : 'silent',
    metafile: true,
    minify: optimizationOptions.scripts,
    outdir: workspaceRoot,
    sourcemap: sourcemapOptions.scripts && (sourcemapOptions.hidden ? 'external' : true),
    write: false,
    platform: 'neutral',
    preserveSymlinks,
    plugins: [
      createSourcemapIngorelistPlugin(),
      createVirtualModulePlugin({
        namespace,
        external: true,
        // Add the `js` extension here so that esbuild generates an output file with the extension
        transformPath: (path) => path.slice(namespace.length + 1) + '.js',
        loadContent: (args, build) =>
          createCachedLoad(loadCache, async (args) => {
            const files = globalScripts.find(({ name }) => name === args.path.slice(0, -3))?.files;
            assert(files, `Invalid operation: global scripts name not found [${args.path}]`);

            // Global scripts are concatenated using magic-string instead of bundled via esbuild.
            const bundleContent = new Bundle();
            const watchFiles = [];
            for (const filename of files) {
              let fileContent;
              try {
                // Attempt to read as a relative path from the workspace root
                fileContent = await readFile(path.join(workspaceRoot, filename), 'utf-8');
                watchFiles.push(filename);
              } catch (e) {
                assertIsError(e);
                if (e.code !== 'ENOENT') {
                  throw e;
                }

                // If not found attempt to resolve as a module specifier
                const resolveResult = await build.resolve(filename, {
                  kind: 'entry-point',
                  resolveDir: workspaceRoot,
                });

                if (resolveResult.errors.length) {
                  // Remove resolution failure notes about marking as external since it doesn't apply
                  // to global scripts.
                  resolveResult.errors.forEach((error) => (error.notes = []));

                  return {
                    errors: resolveResult.errors,
                    warnings: resolveResult.warnings,
                  };
                }

                watchFiles.push(path.relative(resolveResult.path, workspaceRoot));
                fileContent = await readFile(resolveResult.path, 'utf-8');
              }

              bundleContent.addSource(new MagicString(fileContent, { filename }));
            }

            return {
              contents: bundleContent.toString(),
              loader: 'js',
              watchFiles,
            };
          }).call(build, args),
      }),
    ],
  };
}
