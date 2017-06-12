/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Rule} from '../engine/interface';
import {Tree} from '../tree/interface';


export function move(root: string): Rule {
  return (tree: Tree) => {
    tree.files.forEach(originalPath => tree.rename(originalPath, `${root}/${originalPath}`));
    return tree;
  };
}
