/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
import { normalize, virtualFs } from '@angular-devkit/core';
import { Action } from './action';
import { HostTree } from './host-tree';
import { VirtualTree } from './virtual';

describe('HostTree', () => {
  it('is backward compatible with VirtualTree', () => {

    const fs = new virtualFs.test.TestHost({
      '/file1': '',
    });

    const tree = new HostTree(fs);
    const vTree = new VirtualTree();

    tree.create('/file2', '');
    vTree.create('/file3', '');

    // This is the behaviour of 6.0.x merge (returning the branch).
    // We need to be compatible with it.
    const tree2 = tree.branch();
    tree2.merge(vTree);

    const actions = tree2.actions;
    expect(actions).toEqual([
        jasmine.objectContaining<Action>({ kind: 'c', path: normalize('/file2') }),
        jasmine.objectContaining<Action>({ kind: 'c', path: normalize('/file3') }),
    ] as any);
  });
});
