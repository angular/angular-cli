/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Plugin } from 'esbuild';

/**
 * The field identifier for the sourcemap Chrome Devtools ignore list extension.
 *
 * Following the naming conventions from https://sourcemaps.info/spec.html#h.ghqpj1ytqjbm
 */
const IGNORE_LIST_ID = 'x_google_ignoreList';

/**
 * The UTF-8 bytes for the node modules check text used to avoid unnecessary parsing
 * of a full source map if not present in the source map data.
 */
const NODE_MODULE_BYTES = Buffer.from('node_modules/', 'utf-8');

/**
 * Minimal sourcemap object required to create the ignore list.
 */
interface SourceMap {
  sources: string[];
  [IGNORE_LIST_ID]?: number[];
}

/**
 * Creates an esbuild plugin that updates generated sourcemaps to include the Chrome
 * DevTools ignore list extension. All source files that originate from a node modules
 * directory are added to the ignore list by this plugin.
 *
 * For more information, see https://developer.chrome.com/articles/x-google-ignore-list/
 * @returns An esbuild plugin.
 */
export function createSourcemapIngorelistPlugin(): Plugin {
  return {
    name: 'angular-sourcemap-ignorelist',
    setup(build): void {
      if (!build.initialOptions.sourcemap) {
        return;
      }

      build.onEnd((result) => {
        if (!result.outputFiles) {
          return;
        }

        for (const file of result.outputFiles) {
          // Only process sourcemap files
          if (!file.path.endsWith('.map')) {
            continue;
          }

          // Create a Buffer object that shares the memory of the output file contents
          const contents = Buffer.from(
            file.contents.buffer,
            file.contents.byteOffset,
            file.contents.byteLength,
          );

          // Avoid parsing sourcemaps that have no node modules references
          if (!contents.includes(NODE_MODULE_BYTES)) {
            continue;
          }

          const map = JSON.parse(contents.toString('utf-8')) as SourceMap;
          const ignoreList = [];

          // Check and store the index of each source originating from a node modules directory
          for (let index = 0; index < map.sources.length; ++index) {
            const location = map.sources[index].indexOf('node_modules/');
            if (location === 0 || (location > 0 && map.sources[index][location - 1] === '/')) {
              ignoreList.push(index);
            }
          }

          // Avoid regenerating the source map if nothing changed
          if (ignoreList.length === 0) {
            continue;
          }

          // Update the sourcemap in the output file
          map[IGNORE_LIST_ID] = ignoreList;
          file.contents = Buffer.from(JSON.stringify(map), 'utf-8');
        }
      });
    },
  };
}
