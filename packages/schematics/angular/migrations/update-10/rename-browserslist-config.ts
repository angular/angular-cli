/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { join } from '@angular-devkit/core';
import { DirEntry, Rule } from '@angular-devkit/schematics';

function* visit(directory: DirEntry): IterableIterator<string> {
  for (const path of directory.subfiles) {
    if (path !== 'browserslist') {
      continue;
    }

    yield join(directory.path, path);
  }

  for (const path of directory.subdirs) {
    if (path === 'node_modules' || path.startsWith('.')) {
      continue;
    }

    yield* visit(directory.dir(path));
  }
}

export default function (): Rule {
  return tree => {
    for (const path of visit(tree.root)) {
      tree.rename(path, path.replace(/browserslist$/, '.browserslistrc'));
    }
  };
}
