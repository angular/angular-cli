/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '@angular-devkit/core';
import { FilterTree, FilteredTree } from './filtered';
import { HostTree } from './host-tree';
import { VirtualTree } from './virtual';


describe('FilteredTree', () => {
  it('works', () => {
    const tree = new VirtualTree;
    tree.create('/file1', '');
    tree.create('/file2', '');
    tree.create('/file3', '');

    const filtered = new FilteredTree(tree, p => p != '/file2');
    expect(filtered.files.sort()).toEqual(['/file1', '/file3'].map(normalize));
  });
});

describe('FilterTree', () => {
  it('works', () => {
    const tree = new HostTree();
    tree.create('/file1', '');
    tree.create('/file2', '');
    tree.create('/file3', '');

    const filtered = new FilterTree(tree, p => p != '/file2');
    const filteredFiles: string[] = [];
    filtered.visit(path => filteredFiles.push(path));
    expect(filteredFiles.sort()).toEqual(['/file1', '/file3'].map(normalize));
  });

  it('works with two filters', () => {
    const tree = new HostTree();
    tree.create('/file1', '');
    tree.create('/file2', '');
    tree.create('/file3', '');

    const filtered = new FilterTree(tree, p => p != '/file2');
    const filtered2 = new FilterTree(filtered, p => p != '/file3');
    const filteredFiles: string[] = [];
    filtered2.visit(path => filteredFiles.push(path));
    expect(filteredFiles.sort()).toEqual(['/file1'].map(normalize));
  });
});
