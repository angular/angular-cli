/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Plugin } from 'esbuild';
import { extname, isAbsolute } from 'node:path';

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

      const loaderFileExtensions = loaderOptionKeys && new Set(loaderOptionKeys);

      // esbuild's external packages option considers any package-like path as external
      // which would exclude paths that are absolute or explicitly relative
      build.onResolve({ filter: /^[^./]/ }, async (args) => {
        // Skip marking excluded packages
        if (exclusions?.has(args.path)) {
          return null;
        }

        // Allow customized loaders to run against configured paths regardless of location
        if (loaderFileExtensions?.has(extname(args.path))) {
          return null;
        }

        // Avoid considering Windows absolute paths as package paths
        if (isAbsolute(args.path)) {
          return null;
        }

        // Consider the path a package and external
        return {
          path: args.path,
          external: true,
        };
      });
    },
  };
}
