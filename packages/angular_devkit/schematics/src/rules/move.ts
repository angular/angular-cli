/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize } from '@angular-devkit/core';
import { Rule } from '../engine/interface';
import { MergeStrategy } from '../tree/interface';
import { noop } from './base';

export function move(from: string, to?: string | string[]): Rule {
  if (to === undefined) {
    to = from;
    from = '/';
  }

  if (typeof from === 'string' && typeof to === 'string' && from === to) {
    return noop;
  }

  if (typeof to === 'string') {
    // For simplicity, we wrap to string into an array
    to = new Array(to);
  }

  return (tree) => {
    const fromPath = normalize('/' + from);

    (to as Array<string>).forEach((toElement: string) => {
      const toPath = normalize('/' + toElement);

      // we branch on tree to not override former fromPath
      const branch = tree.branch();

      if (tree.exists(fromPath)) {
        // fromPath is a file
        branch.rename(fromPath, toPath);
      } else {
        // fromPath is a directory
        branch.getDir(fromPath).visit((path) => {
          branch.rename(path, join(toPath, path.substr(fromPath.length)));
        });
      }

      tree.merge(branch, MergeStrategy.Overwrite);
    });

    return tree;
  };
}
