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

          const contents = Buffer.from(file.contents);

          // Avoid parsing sourcemaps that have no node modules references
          if (!contents.includes('node_modules/')) {
            continue;
          }

          const map = JSON.parse(contents.toString('utf-8')) as SourceMap;
          const ignoreList = [];

          // Check and store the index of each source originating from a node modules directory
          for (let index = 0; index < map.sources.length; ++index) {
            if (
              map.sources[index].startsWith('node_modules/') ||
              map.sources[index].includes('/node_modules/')
            ) {
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
