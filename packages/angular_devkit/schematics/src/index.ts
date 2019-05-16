/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { FilePredicate, MergeStrategy, Tree as TreeInterface } from './tree/interface';
import { branch, empty, merge, optimize, partition } from './tree/static';


export { SchematicsException } from './exception/exception';

export * from './tree/action';
export * from './engine/index';
export * from './exception/exception';
export * from './tree/interface';
export * from './rules/base';
export * from './rules/call';
export * from './rules/move';
export * from './rules/random';
export * from './rules/schematic';
export * from './rules/template';
export * from './rules/url';
export * from './tree/delegate';
export * from './tree/empty';
export * from './tree/host-tree';
export { UpdateRecorder } from './tree/interface';
export * from './engine/schematic';
export * from './sink/dryrun';
export * from './sink/filesystem';
export * from './sink/host';
export * from './sink/sink';

import * as formats from './formats/index';
export { formats };

import * as workflow from './workflow/index';
export { workflow };

export interface TreeConstructor {
  empty(): TreeInterface;
  branch(tree: TreeInterface): TreeInterface;
  merge(tree: TreeInterface, other: TreeInterface, strategy?: MergeStrategy): TreeInterface;
  partition(tree: TreeInterface, predicate: FilePredicate<boolean>): [TreeInterface, TreeInterface];
  optimize(tree: TreeInterface): TreeInterface;
}

export type Tree = TreeInterface;
export const Tree: TreeConstructor = {
  empty() { return empty(); },
  branch(tree: TreeInterface) { return branch(tree); },
  merge(tree: TreeInterface,
        other: TreeInterface,
        strategy: MergeStrategy = MergeStrategy.Default) {
    return merge(tree, other, strategy);
  },
  partition(tree: TreeInterface, predicate: FilePredicate<boolean>) {
    return partition(tree, predicate);
  },
  optimize(tree: TreeInterface) { return optimize(tree); },
};
