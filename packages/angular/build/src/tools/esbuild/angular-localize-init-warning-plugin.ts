/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin } from 'esbuild';

const NG_LOCALIZE_RESOLUTION = Symbol('NG_LOCALIZE_RESOLUTION');

/**
 * This plugin addresses an issue where '@angular/localize/init' is directly imported,
 * potentially resulting in undefined behavior. By detecting such imports, the plugin
 * issues a warning and suggests including '@angular/localize/init' as a polyfill.
 *
 * @returns An esbuild plugin.
 */
export function createAngularLocalizeInitWarningPlugin(): Plugin {
  return {
    name: 'angular-localize-init-warning',
    setup(build) {
      build.onResolve({ filter: /^@angular\/localize\/init/ }, async (args) => {
        if (args.pluginData?.[NG_LOCALIZE_RESOLUTION]) {
          return null;
        }

        const { importer, kind, resolveDir, namespace, pluginData = {} } = args;
        pluginData[NG_LOCALIZE_RESOLUTION] = true;

        const result = await build.resolve(args.path, {
          importer,
          kind,
          namespace,
          pluginData,
          resolveDir,
        });

        return {
          ...result,
          warnings: [
            ...result.warnings,
            {
              text: `Direct import of '@angular/localize/init' detected. This may lead to undefined behavior.`,
              notes: [{ text: `Include '@angular/localize/init' as a polyfill instead.` }],
            },
          ],
        };
      });
    },
  };
}
