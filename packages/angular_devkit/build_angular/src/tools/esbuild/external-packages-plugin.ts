/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Plugin } from 'esbuild';

const EXTERNAL_PACKAGE_RESOLUTION = Symbol('EXTERNAL_PACKAGE_RESOLUTION');

/**
 * Creates a plugin that marks any resolved path as external if it is within a node modules directory.
 * This is used instead of the esbuild `packages` option to avoid marking bare specifiers that use
 * tsconfig path mapping to resolve to a workspace relative path. This is common for monorepos that
 * contain libraries that are built along with the application. These libraries should not be considered
 *
 * @returns An esbuild plugin.
 */
export function createExternalPackagesPlugin(): Plugin {
  return {
    name: 'angular-external-packages',
    setup(build) {
      build.onResolve({ filter: /./ }, async (args) => {
        if (args.pluginData?.[EXTERNAL_PACKAGE_RESOLUTION]) {
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

        if (result.path && /[\\/]node_modules[\\/]/.test(result.path)) {
          return {
            path: args.path,
            external: true,
          };
        }

        return result;
      });
    },
  };
}
