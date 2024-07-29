/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin, PluginBuild } from 'esbuild';
import { extname, join } from 'node:path';

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
        const { importer, path, kind, resolveDir, namespace, pluginData = {} } = args;

        // Only attempt to resolve url tokens which only exist inside CSS.
        // Also, skip this plugin if already attempting to resolve the url-token.
        if (kind !== 'url-token' || pluginData[CSS_RESOURCE_RESOLUTION]) {
          return null;
        }

        let [containingDir, resourceUrl] = path.split('||file:', 2);
        if (resourceUrl === undefined) {
          // This can happen due to early exit checks in rebasing-importer
          // logic such as when the url is an external URL.
          resourceUrl = containingDir;
          containingDir = '';
        }

        // If root-relative, absolute or protocol relative url, mark as external to leave the
        // path/URL in place.
        if (/^((?:\w+:)?\/\/|data:|chrome:|#|\/)/.test(resourceUrl)) {
          return {
            path: resourceUrl,
            external: true,
          };
        }

        pluginData[CSS_RESOURCE_RESOLUTION] = true;

        const result = await build.resolve(resourceUrl, {
          importer,
          kind,
          namespace,
          pluginData,
          resolveDir: join(resolveDir, containingDir),
        });

        if (result.errors.length) {
          const error = result.errors[0];
          if (resourceUrl[0] === '~') {
            error.notes = [
              {
                location: null,
                text: 'You can remove the tilde and use a relative path to reference it, which should remove this error.',
              },
            ];
          } else if (resourceUrl[0] === '^') {
            error.notes = [
              {
                location: null,
                text:
                  'You can remove the caret and add the path to the `externalDependencies` build option,' +
                  ' which should remove this error.',
              },
            ];
          }

          const extension = importer && extname(importer);
          if (extension !== '.css') {
            error.notes.push({
              location: null,
              text: 'Preprocessor stylesheets may not show the exact file location of the error.',
            });
          }
        }

        return result;
      });
    },
  };
}
