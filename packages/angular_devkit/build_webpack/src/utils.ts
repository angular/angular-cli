/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { existsSync } from 'fs';
import * as path from 'path';
import { URL, pathToFileURL } from 'url';
import { Compilation, Configuration } from 'webpack';

export interface EmittedFiles {
  id?: string;
  name?: string;
  file: string;
  initial: boolean;
  asset?: boolean;
  extension: string;
}

export function getEmittedFiles(compilation: Compilation): EmittedFiles[] {
  const files: EmittedFiles[] = [];
  const chunkFileNames = new Set<string>();

  // adds all chunks to the list of emitted files such as lazy loaded modules
  for (const chunk of compilation.chunks) {
    for (const file of chunk.files) {
      if (chunkFileNames.has(file)) {
        continue;
      }

      chunkFileNames.add(file);
      files.push({
        id: chunk.id?.toString(),
        name: chunk.name,
        file,
        extension: path.extname(file),
        initial: chunk.isOnlyInitial(),
      });
    }
  }

  // add all other files
  for (const file of Object.keys(compilation.assets)) {
    // Chunk files have already been added to the files list above
    if (chunkFileNames.has(file)) {
      continue;
    }

    files.push({ file, extension: path.extname(file), initial: false, asset: true });
  }

  return files;
}

/**
 * This uses a dynamic import to load a module which may be ESM.
 * CommonJS code can load ESM code via a dynamic import. Unfortunately, TypeScript
 * will currently, unconditionally downlevel dynamic import into a require call.
 * require calls cannot load ESM code and will result in a runtime error. To workaround
 * this, a Function constructor is used to prevent TypeScript from changing the dynamic import.
 * Once TypeScript provides support for keeping the dynamic import this workaround can
 * be dropped.
 *
 * @param modulePath The path of the module to load.
 * @returns A Promise that resolves to the dynamically imported module.
 */
function loadEsmModule<T>(modulePath: string | URL): Promise<T> {
  return new Function('modulePath', `return import(modulePath);`)(modulePath) as Promise<T>;
}

export async function getWebpackConfig(configPath: string): Promise<Configuration> {
  if (!existsSync(configPath)) {
    throw new Error(`Webpack configuration file ${configPath} does not exist.`);
  }

  switch (path.extname(configPath)) {
    case '.mjs':
      // Load the ESM configuration file using the TypeScript dynamic import workaround.
      // Once TypeScript provides support for keeping the dynamic import this workaround can be
      // changed to a direct dynamic import.
      return (await loadEsmModule<{ default: Configuration }>(pathToFileURL(configPath))).default;
    case '.cjs':
      return require(configPath);
    default:
      // The file could be either CommonJS or ESM.
      // CommonJS is tried first then ESM if loading fails.
      try {
        return require(configPath);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ERR_REQUIRE_ESM') {
          // Load the ESM configuration file using the TypeScript dynamic import workaround.
          // Once TypeScript provides support for keeping the dynamic import this workaround can be
          // changed to a direct dynamic import.
          return (await loadEsmModule<{ default: Configuration }>(pathToFileURL(configPath)))
            .default;
        }

        throw e;
      }
  }
}
