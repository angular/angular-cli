/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Plugin } from 'esbuild';
import { extname } from 'node:path';

const EXTERNAL_PACKAGE_RESOLUTION = Symbol('EXTERNAL_PACKAGE_RESOLUTION');

/**
 * Creates a plugin that marks any resolved path as external if it is within a node modules directory.
 * This is used instead of the esbuild `packages` option to avoid marking files that should be loaded
 * via customized loaders. This is necessary to prevent Vite development server pre-bundling errors.
 *
 * @returns An esbuild plugin.
 */
export function createExternalPackagesPlugin(options?: { exclude?: string[] }): Plugin {
  const exclusions = options?.exclude?.length ? new Set(options.exclude) : undefined;

  return {
    name: 'angular-external-packages',
    setup(build) {
      const loaderOptionKeys =
        build.initialOptions.loader && Object.keys(build.initialOptions.loader);

      // Safe to use native packages external option if no loader options or exclusions present
      if (!exclusions && !loaderOptionKeys?.length) {
        build.initialOptions.packages = 'external';

        return;
      }

      const loaderFileExtensions = new Set(loaderOptionKeys);

      // Only attempt resolve of non-relative and non-absolute paths
      build.onResolve({ filter: /^[^./]/ }, async (args) => {
        if (args.pluginData?.[EXTERNAL_PACKAGE_RESOLUTION]) {
          return null;
        }

        if (exclusions?.has(args.path)) {
          return null;
        }

        const { importer, kind, resolveDir, namespace, pluginData = {} } = args;
        pluginData[EXTERNAL_PACKAGE_RESOLUTION] = true;

        const result = await build.resolve(args.path, {
          importer,
          kind,
          namespace,
          pluginData,
          resolveDir,
        });

        // Return result if unable to resolve or explicitly marked external (externalDependencies option)
        if (!result.path || result.external) {
          return result;
        }

        // Allow customized loaders to run against configured paths regardless of location
        if (loaderFileExtensions.has(extname(result.path))) {
          return result;
        }

        // Mark paths from a node modules directory as external
        if (/[\\/]node_modules[\\/]/.test(result.path)) {
          return {
            path: args.path,
            external: true,
          };
        }

        // Otherwise return original result
        return result;
      });
    },
  };
}
