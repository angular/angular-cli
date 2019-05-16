/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicsException } from '../exception/exception';
import { FilterHostTree, HostTree } from './host-tree';
import { FilePredicate, MergeStrategy, Tree } from './interface';


export function empty() {
  return new HostTree();
}

export function branch(tree: Tree) {
  return tree.branch();
}

export function merge(tree: Tree, other: Tree, strategy: MergeStrategy = MergeStrategy.Default) {
  tree.merge(other, strategy);

  return tree;
}

export function partition(tree: Tree, predicate: FilePredicate<boolean>): [Tree, Tree] {
  if (tree instanceof HostTree) {
    return [
      new FilterHostTree(tree, predicate),
      new FilterHostTree(tree, (path, entry) => !predicate(path, entry)),
    ];
  } else {
    throw new SchematicsException('Tree type is not supported.');
  }
}

/** @deprecated Tree's are automically optimized */
export function optimize(tree: Tree) {
  return tree;
}
