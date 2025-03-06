/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
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
  const exclusions = new Set<string>(options?.exclude);
  // Similar to esbuild, --external:@foo/bar automatically implies --external:@foo/bar/*,
  // which matches import paths like @foo/bar/baz.
  // This means all paths within the @foo/bar package are also marked as external.
  const exclusionsPrefixes = options?.exclude?.map((exclusion) => exclusion + '/') ?? [];
  const seenExclusions: Set<string> = new Set();
  const seenExternals = new Set<string>();
  const seenNonExclusions: Set<string> = new Set();

  return {
    name: 'angular-external-packages',
    setup(build) {
      // Find all loader keys that are not using the 'file' loader.
      // The 'file' loader is automatically handled by Vite and does not need exclusion.
      const loaderOptionKeys =
        build.initialOptions.loader &&
        Object.entries(build.initialOptions.loader)
          .filter(([, value]) => value !== 'file')
          .map(([key]) => key);

      // Safe to use native packages external option if no loader options or exclusions present
      if (!exclusions.size && !loaderOptionKeys?.length) {
        build.initialOptions.packages = 'external';

        return;
      }

      const loaderFileExtensions = new Set(loaderOptionKeys);

      // Only attempt resolve of non-relative and non-absolute paths
      build.onResolve({ filter: /^[^./]/ }, async (args) => {
        if (args.pluginData?.[EXTERNAL_PACKAGE_RESOLUTION]) {
          return null;
        }

        if (seenExternals.has(args.path)) {
          return { external: true };
        }

        if (exclusions.has(args.path) || seenExclusions.has(args.path)) {
          return null;
        }

        if (!seenNonExclusions.has(args.path)) {
          for (const exclusion of exclusionsPrefixes) {
            if (args.path.startsWith(exclusion)) {
              seenExclusions.add(args.path);

              return null;
            }
          }

          seenNonExclusions.add(args.path);
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

        // Return result if unable to resolve
        if (!result.path) {
          return result;
        }

        // Return if explicitly marked external (externalDependencies option)
        if (result.external) {
          seenExternals.add(args.path);

          return { external: true };
        }

        // Allow customized loaders to run against configured paths regardless of location
        if (loaderFileExtensions.has(extname(result.path))) {
          return result;
        }

        // Mark paths from a node modules directory as external
        if (/[\\/]node_modules[\\/]/.test(result.path)) {
          seenExternals.add(args.path);

          return { external: true };
        }

        // Otherwise return original result
        return result;
      });
    },
  };
}
