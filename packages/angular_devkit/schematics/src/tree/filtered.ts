/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {FilePredicate, Tree} from './interface';
import {VirtualTree} from './virtual';


export class FilteredTree extends VirtualTree {
  constructor(tree: Tree, filter: FilePredicate<boolean> = () => true) {
    super();

    const virtualTree = (tree instanceof VirtualTree
      ? tree : VirtualTree.optimize(tree)) as VirtualTree;

    const root = virtualTree.root;
    const staging = virtualTree.staging;

    [...root.entries()].forEach(([path, entry]) => {
      if (filter(path, entry)) {
        this._root.set(path, entry);
      }
    });
    [...staging.entries()].forEach(([path, entry]) => {
      if (filter(path, entry)) {
        this._cacheMap.set(path, entry);
      }
    });
    virtualTree.actions.forEach(action => {
      if (this._cacheMap.has(action.path) || this._root.has(action.path)) {
        this._actions.push(action);
      }
    });
  }
}
