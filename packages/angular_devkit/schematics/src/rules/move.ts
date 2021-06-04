/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize } from '@angular-devkit/core';
import { Rule } from '../engine/interface';
import { Tree } from '../tree/interface';
import { noop } from './base';

export function move(from: string, to?: string | string[]): Rule {
  if (typeof to === 'undefined') {
    to = from;
    from = '/';
  }

  if (typeof to === 'string') {
    to = new Array(to);
  }

  return (tree) => {
    const arrayLength = (to as Array<string>).length;

    (to as Array<string>).forEach((toElement: string, index: number) => {
      const requireToBranch = arrayLength !== (index += 1);
      const branchStrategy = requireToBranch ? tree.branch() : tree;
      const fromPath = normalize('/' + from);
      const toPath = normalize('/' + toElement);

      if (fromPath === toPath) {
        return noop;
      }

      if (branchStrategy.exists(fromPath)) {
        branchStrategy.rename(fromPath, toPath);
      } else {
        branchStrategy.getDir(fromPath).visit((path) => {
          branchStrategy.rename(path, join(toPath, path.substr(fromPath.length)));
        });
      }

      if (requireToBranch) {
        tree.merge(branchStrategy);
      }
    });

    return tree;
  };
}
