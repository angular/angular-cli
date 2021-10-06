/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';

export default function (): Rule {
  return (tree, context) => {
    const gitIgnoreEntry = '/.angular/cache';
    const gitIgnorePath = '.gitignore';

    const contents = tree.read(gitIgnorePath)?.toString();
    if (!contents) {
      context.logger.warn(`Could not find '${gitIgnorePath}'.`);

      return;
    }

    if (contents.includes(gitIgnoreEntry)) {
      // The migration has run already.
      return;
    }

    // Try to insert the new entry in the misc section.
    const recorder = tree.beginUpdate(gitIgnorePath);
    let idx = contents.indexOf('# misc');
    if (idx < 0) {
      idx = 0;
    } else {
      switch (contents[idx + 6]) {
        case '\n':
          idx += 7;
          break;
        case '\r':
          idx += 8;
          break;
        default:
          // the word is something else.
          idx = 0;
          break;
      }
    }

    recorder.insertLeft(idx, `${gitIgnoreEntry}\n`);
    tree.commitUpdate(recorder);
  };
}
