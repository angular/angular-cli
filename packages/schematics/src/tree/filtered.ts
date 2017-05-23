import {VirtualTree} from './virtual';
import {FilePredicate, Tree} from './interface';


export class FilteredTree extends VirtualTree {
  constructor(tree: Tree, filter: FilePredicate<boolean> = () => true) {
    const virtualTree = VirtualTree.optimize(tree) as VirtualTree;
    super();

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
