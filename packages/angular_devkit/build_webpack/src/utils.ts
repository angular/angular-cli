/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { URL, pathToFileURL } from 'node:url';
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
        name: chunk.name ?? undefined,
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

export async function getWebpackConfig(configPath: string): Promise<Configuration> {
  if (!existsSync(configPath)) {
    throw new Error(`Webpack configuration file ${configPath} does not exist.`);
  }

  const config = await import(configPath);

  return 'default' in config ? config.default : config;
}
