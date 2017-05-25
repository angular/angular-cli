/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {FilteredTree} from './filtered';
import {VirtualTree} from './virtual';


describe('FilteredTree', () => {
  it('works', () => {
    const tree = new VirtualTree;
    tree.create('/file1', '');
    tree.create('/file2', '');
    tree.create('/file3', '');

    const filtered = new FilteredTree(tree, p => p != '/file2');
    expect(filtered.files.sort()).toEqual(['/file1', '/file3']);
  });
});
