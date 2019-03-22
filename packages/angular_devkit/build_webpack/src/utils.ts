/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as webpack from 'webpack';

export interface EmittedFiles {
  name?: string;
  file: string;
  initial: boolean;
  extension: string;
}

export function getEmittedFiles(compilation: webpack.compilation.Compilation): EmittedFiles[] {
  const getExtension = (file: string) => file.split('.').reverse()[0];
  const files: EmittedFiles[] = [];

  for (const chunk of Object.values(compilation.chunks)) {
    const entry: Partial<EmittedFiles> = {
      name: chunk.name,
      initial: chunk.isOnlyInitial(),
    };

    for (const file of chunk.files) {
      files.push({ ...entry, file, extension: getExtension(file) } as EmittedFiles);
    }
  }

  for (const file of Object.keys(compilation.assets)) {
    if (files.some(e => e.file === file)) {
      // skip as this already exists
      continue;
    }

    files.push({
      file,
      extension: getExtension(file),
      initial: false,
    });
  }

  return files;
}
