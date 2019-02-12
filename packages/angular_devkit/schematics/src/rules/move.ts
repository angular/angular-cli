/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { join, normalize } from '@angular-devkit/core';
import { Rule } from '../engine/interface';
import { noop } from './base';


export function move(from: string, to?: string): Rule {
  if (to === undefined) {
    to = from;
    from = '/';
  }

  const fromPath = normalize('/' + from);
  const toPath = normalize('/' + to);

  if (fromPath === toPath) {
    return noop;
  }

  return tree => {
    if (tree.exists(fromPath)) {
      // fromPath is a file
      tree.rename(fromPath, toPath);
    } else {
      // fromPath is a directory
      tree.getDir(fromPath).visit(path => {
        tree.rename(path, join(toPath, path.substr(fromPath.length)));
      });
    }

    return tree;
  };
}
