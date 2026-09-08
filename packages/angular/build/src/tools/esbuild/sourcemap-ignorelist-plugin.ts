/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
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
 * The UTF-8 bytes for the "sources" property key used to locate the sources array.
 */
const SOURCES_KEY_BYTES = Buffer.from('"sources"', 'utf-8');

/**
 * The UTF-8 bytes for the ignore list identifier to check if already present.
 */
const IGNORE_LIST_BYTES = Buffer.from(`"${IGNORE_LIST_ID}"`, 'utf-8');

/**
 * Minimal sourcemap object required to create the ignore list.
 */
interface SourceMap {
  sources: string[];
  [IGNORE_LIST_ID]?: number[];
}

function extractSources(contents: Buffer): string[] | undefined {
  const sourcesKeyIndex = contents.indexOf(SOURCES_KEY_BYTES);
  if (sourcesKeyIndex === -1) {
    return undefined;
  }

  // Find the ':' after "sources"
  let colonIndex = sourcesKeyIndex + SOURCES_KEY_BYTES.length;
  while (colonIndex < contents.length && contents[colonIndex] <= 0x20) {
    colonIndex++;
  }
  if (contents[colonIndex] !== 0x3a /* : */) {
    return undefined;
  }

  // Find the '[' for the array
  let arrayStartIndex = colonIndex + 1;
  while (arrayStartIndex < contents.length && contents[arrayStartIndex] <= 0x20) {
    arrayStartIndex++;
  }
  if (contents[arrayStartIndex] !== 0x5b /* [ */) {
    return undefined;
  }

  // Scan until matching ']'
  let depth = 0;
  let inString = false;
  for (let i = arrayStartIndex; i < contents.length; i++) {
    const byte = contents[i];
    if (inString) {
      if (byte === 0x5c /* \ */) {
        i++; // skip escaped character
      } else if (byte === 0x22 /* " */) {
        inString = false;
      }
    } else if (byte === 0x22 /* " */) {
      inString = true;
    } else if (byte === 0x5b /* [ */) {
      depth++;
    } else if (byte === 0x5d /* ] */) {
      depth--;
      if (depth === 0) {
        try {
          const slice = contents.toString('utf-8', arrayStartIndex, i + 1);
          const parsed = JSON.parse(slice);

          return Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')
            ? (parsed as string[])
            : undefined;
        } catch {
          return undefined;
        }
      }
    }
  }

  return undefined;
}

function updateSourcemapFast(contents: Buffer, ignoreList: readonly number[]): Buffer | undefined {
  let braceIndex = 0;
  while (braceIndex < contents.length && contents[braceIndex] <= 0x20) {
    braceIndex++;
  }
  if (contents[braceIndex] !== 0x7b /* { */) {
    return undefined;
  }

  const injection = Buffer.from(`"${IGNORE_LIST_ID}":${JSON.stringify(ignoreList)},`, 'utf-8');

  return Buffer.concat([
    contents.subarray(0, braceIndex + 1),
    injection,
    contents.subarray(braceIndex + 1),
  ]);
}

/**
 * Creates an esbuild plugin that updates generated sourcemaps to include the Chrome
 * DevTools ignore list extension. All source files that originate from a node modules
 * directory are added to the ignore list by this plugin.
 *
 * For more information, see https://developer.chrome.com/articles/x-google-ignore-list/
 * @returns An esbuild plugin.
 */
export function createSourcemapIgnorelistPlugin(): Plugin {
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

          let fastPathSuccess = false;
          if (!contents.includes(IGNORE_LIST_BYTES)) {
            const sources = extractSources(contents);
            if (sources) {
              const ignoreList: number[] = [];
              for (let index = 0; index < sources.length; ++index) {
                const location = sources[index].indexOf('node_modules/');
                if (location === 0 || (location > 0 && sources[index][location - 1] === '/')) {
                  ignoreList.push(index);
                }
              }

              if (ignoreList.length === 0) {
                continue;
              }

              const updated = updateSourcemapFast(contents, ignoreList);
              if (updated) {
                file.contents = updated;
                fastPathSuccess = true;
              }
            }
          }

          if (fastPathSuccess) {
            continue;
          }

          // Fallback to full JSON parse/stringify if fast scanning or splicing fails
          const map = JSON.parse(contents.toString('utf-8')) as SourceMap;
          if (map[IGNORE_LIST_ID]) {
            continue;
          }

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
