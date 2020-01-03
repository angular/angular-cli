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
  id?: string;
  name?: string;
  file: string;
  initial: boolean;
  asset?: boolean;
  extension: string;
}

export function getEmittedFiles(compilation: webpack.compilation.Compilation): EmittedFiles[] {
  const files: EmittedFiles[] = [];

  // adds all chunks to the list of emitted files such as lazy loaded modules
  for (const chunk of compilation.chunks as webpack.compilation.Chunk[]) {
    for (const file of chunk.files as string[]) {
      files.push({
        // The id is guaranteed to exist at this point in the compilation process
        // tslint:disable-next-line: no-non-null-assertion
        id: chunk.id!.toString(),
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
