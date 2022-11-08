/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Plugin, PluginBuild } from 'esbuild';
import { readFile } from 'fs/promises';

/**
 * Symbol marker used to indicate CSS resource resolution is being attempted.
 * This is used to prevent an infinite loop within the plugin's resolve hook.
 */
const CSS_RESOURCE_RESOLUTION = Symbol('CSS_RESOURCE_RESOLUTION');

/**
 * Creates an esbuild {@link Plugin} that loads all CSS url token references using the
 * built-in esbuild `file` loader. A plugin is used to allow for all file extensions
 * and types to be supported without needing to manually specify all extensions
 * within the build configuration.
 *
 * @returns An esbuild {@link Plugin} instance.
 */
export function createCssResourcePlugin(): Plugin {
  return {
    name: 'angular-css-resource',
    setup(build: PluginBuild): void {
      build.onResolve({ filter: /.*/ }, async (args) => {
        // Only attempt to resolve url tokens which only exist inside CSS.
        // Also, skip this plugin if already attempting to resolve the url-token.
        if (args.kind !== 'url-token' || args.pluginData?.[CSS_RESOURCE_RESOLUTION]) {
          return null;
        }

        // If root-relative, absolute or protocol relative url, mark as external to leave the
        // path/URL in place.
        if (/^((?:\w+:)?\/\/|data:|chrome:|#|\/)/.test(args.path)) {
          return {
            path: args.path,
            external: true,
          };
        }

        const { importer, kind, resolveDir, namespace, pluginData = {} } = args;
        pluginData[CSS_RESOURCE_RESOLUTION] = true;

        const result = await build.resolve(args.path, {
          importer,
          kind,
          namespace,
          pluginData,
          resolveDir,
        });

        return {
          ...result,
          namespace: 'css-resource',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'css-resource' }, async (args) => {
        return {
          contents: await readFile(args.path),
          loader: 'file',
        };
      });
    },
  };
}
