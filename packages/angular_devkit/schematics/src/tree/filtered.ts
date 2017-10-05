/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { FilePredicate, Tree } from './interface';
import { VirtualTree } from './virtual';


export class FilteredTree extends VirtualTree {
  constructor(tree: Tree, filter: FilePredicate<boolean> = () => true) {
    super();

    const virtualTree = (tree instanceof VirtualTree
      ? tree : VirtualTree.optimize(tree)) as VirtualTree;

    // We don't know for sure that it's a FilteredTree, but we don't care;
    // VirtualTree has `tree`, we just need access to it because it's protected.
    const root = (virtualTree as FilteredTree).tree;
    const staging = virtualTree.staging;

    [...root.entries()].forEach(([path, entry]) => {
      if (filter(path, entry)) {
        this._tree.set(path, entry);
      }
    });
    [...staging.entries()].forEach(([path, entry]) => {
      if (filter(path, entry)) {
        this._cacheMap.set(path, entry);
      }
    });
    virtualTree.actions.forEach(action => {
      if (this._cacheMap.has(action.path) || this._tree.has(action.path)) {
        this._actions.push(action);
      }
    });
  }
}
