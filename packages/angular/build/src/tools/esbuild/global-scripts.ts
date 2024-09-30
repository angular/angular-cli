/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import MagicString, { Bundle } from 'magic-string';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { assertIsError } from '../../utils/error';
import { BundlerOptionsFactory } from './bundler-context';
import { createCachedLoad } from './load-result-cache';
import { createSourcemapIgnorelistPlugin } from './sourcemap-ignorelist-plugin';
import { createVirtualModulePlugin } from './virtual-module-plugin';

/**
 * Create an esbuild 'build' options object for all global scripts defined in the user provied
 * build options.
 * @param options The builder's user-provider normalized options.
 * @returns An esbuild BuildOptions object.
 */
export function createGlobalScriptsBundleOptions(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  initial: boolean,
): BundlerOptionsFactory | undefined {
  const {
    globalScripts,
    optimizationOptions,
    outputNames,
    preserveSymlinks,
    sourcemapOptions,
    jsonLogs,
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

  return (loadCache) => {
    return {
      absWorkingDir: workspaceRoot,
      bundle: false,
      splitting: false,
      entryPoints,
      entryNames: initial ? outputNames.bundles : '[name]',
      assetNames: outputNames.media,
      mainFields: ['script', 'browser', 'main'],
      conditions: ['script', optimizationOptions.scripts ? 'production' : 'development'],
      resolveExtensions: ['.mjs', '.js', '.cjs'],
      logLevel: options.verbose && !jsonLogs ? 'debug' : 'silent',
      metafile: true,
      minify: optimizationOptions.scripts,
      outdir: workspaceRoot,
      sourcemap: sourcemapOptions.scripts && (sourcemapOptions.hidden ? 'external' : true),
      write: false,
      platform: 'neutral',
      target,
      preserveSymlinks,
      plugins: [
        createSourcemapIgnorelistPlugin(),
        createVirtualModulePlugin({
          namespace,
          external: true,
          // Add the `js` extension here so that esbuild generates an output file with the extension
          transformPath: (path) => path.slice(namespace.length + 1) + '.js',
          loadContent: (args, build) =>
            createCachedLoad(loadCache, async (args) => {
              const files = globalScripts.find(
                ({ name }) => name === args.path.slice(0, -3),
              )?.files;
              assert(files, `Invalid operation: global scripts name not found [${args.path}]`);

              // Global scripts are concatenated using magic-string instead of bundled via esbuild.
              const bundleContent = new Bundle();
              const watchFiles = [];
              for (const filename of files) {
                let fileContent;
                try {
                  // Attempt to read as a relative path from the workspace root
                  const fullPath = path.join(workspaceRoot, filename);
                  fileContent = await readFile(fullPath, 'utf-8');
                  watchFiles.push(fullPath);
                } catch (e) {
                  assertIsError(e);
                  if (e.code !== 'ENOENT') {
                    throw e;
                  }

                  // If not found, attempt to resolve as a module specifier
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

                  watchFiles.push(resolveResult.path);
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
  };
}
