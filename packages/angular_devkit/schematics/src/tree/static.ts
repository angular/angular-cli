/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { FilteredTree } from './filtered';
import { HostTree } from './host-tree';
import { FilePredicate, MergeStrategy, Tree } from './interface';
import { VirtualTree } from './virtual';


export function empty() {
  return new HostTree();
}

export function branch(tree: Tree) {
  if (tree instanceof HostTree) {
    return tree.branch();
  }

  return VirtualTree.branch(tree);
}

export function merge(tree: Tree, other: Tree, strategy: MergeStrategy = MergeStrategy.Default) {
  if (tree instanceof HostTree) {
    tree.merge(other, strategy);

    return tree;
  }

  return VirtualTree.merge(tree, other, strategy);
}

export function partition(tree: Tree, predicate: FilePredicate<boolean>): [Tree, Tree] {
  return [
    new FilteredTree(tree, predicate),
    new FilteredTree(tree, (path, entry) => !predicate(path, entry)),
  ];
}

export function optimize(tree: Tree) {
  if (tree instanceof HostTree) {
    return tree;
  }

  return VirtualTree.optimize(tree);
}
