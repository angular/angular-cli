/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '@angular-devkit/core';
import { Rule } from '../engine/interface';


export function move(from: string, to?: string): Rule {
  if (to === undefined) {
    to = from;
    from = '/';
  }

  const fromPath = normalize('/' + from);
  const toPath = normalize('/' + to);

  return tree => tree.visit(path => {
    if (path.startsWith(fromPath)) {
      tree.rename(path, toPath + '/' + path.substr(fromPath.length));
    }
  });
}
