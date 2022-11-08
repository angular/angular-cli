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
import { NormalizedBrowserOptions } from './options';

/**
 * Create an esbuild 'build' options object for all global scripts defined in the user provied
 * build options.
 * @param options The builder's user-provider normalized options.
 * @returns An esbuild BuildOptions object.
 */
export function createGlobalScriptsBundleOptions(options: NormalizedBrowserOptions): BuildOptions {
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
  for (const { name } of globalScripts) {
    entryPoints[name] = `${namespace}:${name}`;
  }

  return {
    absWorkingDir: workspaceRoot,
    bundle: false,
    splitting: false,
    entryPoints,
    entryNames: outputNames.bundles,
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
      {
        name: 'angular-global-scripts',
        setup(build) {
          build.onResolve({ filter: /^angular:script\/global:/ }, (args) => {
            if (args.kind !== 'entry-point') {
              return null;
            }

            return {
              // Add the `js` extension here so that esbuild generates an output file with the extension
              path: args.path.slice(namespace.length + 1) + '.js',
              namespace,
            };
          });
          // All references within a global script should be considered external. This maintains the runtime
          // behavior of the script as if it were added directly to a script element for referenced imports.
          build.onResolve({ filter: /./, namespace }, ({ path }) => {
            return {
              path,
              external: true,
            };
          });
          build.onLoad({ filter: /./, namespace }, async (args) => {
            const files = globalScripts.find(({ name }) => name === args.path.slice(0, -3))?.files;
            assert(files, `Invalid operation: global scripts name not found [${args.path}]`);

            // Global scripts are concatenated using magic-string instead of bundled via esbuild.
            const bundleContent = new Bundle();
            for (const filename of files) {
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

              const fileContent = await readFile(resolveResult.path, 'utf-8');
              bundleContent.addSource(new MagicString(fileContent, { filename }));
            }

            return {
              contents: bundleContent.toString(),
              loader: 'js',
            };
          });
        },
      },
    ],
  };
}
