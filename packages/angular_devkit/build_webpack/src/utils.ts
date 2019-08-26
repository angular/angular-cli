/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as path from 'path';
import * as webpack from 'webpack';

export interface EmittedFiles {
  name?: string;
  file: string;
  initial: boolean;
  asset?: boolean;
  extension: string;
}

export function getEmittedFiles(compilation: webpack.compilation.Compilation): EmittedFiles[] {
  const files: EmittedFiles[] = [];

  // entrypoints might have multiple outputs
  // such as runtime.js
  for (const [name, entrypoint] of compilation.entrypoints) {
    const entryFiles: string[] = (entrypoint && entrypoint.getFiles()) || [];
    for (const file of entryFiles) {
      files.push({ name, file, extension: path.extname(file), initial: true });
    }
  }

  // adds all chunks to the list of emitted files such as lazy loaded modules
  for (const chunk of Object.values(compilation.chunks)) {
    for (const file of chunk.files as string[]) {
      files.push({
        name: chunk.name,
        file,
        extension: path.extname(file),
        initial: chunk.isOnlyInitial(),
      });
    }
  }

  // other all files
  for (const file of Object.keys(compilation.assets)) {
    files.push({ file, extension: path.extname(file), initial: false, asset: true });
  }

  // dedupe
  return files.filter(({ file, name }, index) =>
    files.findIndex(f => f.file === file && (!name || name === f.name)) === index);
}
