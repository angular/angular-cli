/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, join } from '@angular-devkit/core';
import { DirEntry, Rule } from '@angular-devkit/schematics';

function visit(directory: DirEntry): Path[] {
  const files: Path[] = [];

  for (const path of directory.subfiles) {
    if (path !== 'browserslist') {
      continue;
    }

    files.push(join(directory.path, path));
  }

  for (const path of directory.subdirs) {
    if (path === 'node_modules') {
      continue;
    }

    files.push(...visit(directory.dir(path)));
  }

  return files;
}

export default function (): Rule {
  return tree => {
    for (const path of visit(tree.root)) {
      tree.rename(path, path.replace(/browserslist$/, '.browserslistrc'));
    }
  };
}
