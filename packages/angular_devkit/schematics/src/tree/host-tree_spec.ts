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
import { FilterHostTree, HostTree } from './host-tree';
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

describe('FilterHostTree', () => {
  it('works', () => {
    const tree = new HostTree();
    tree.create('/file1', '');
    tree.create('/file2', '');
    tree.create('/file3', '');

    const filtered = new FilterHostTree(tree, p => p != '/file2');
    const filteredFiles: string[] = [];
    filtered.visit(path => filteredFiles.push(path));
    expect(filteredFiles.sort()).toEqual(['/file1', '/file3'].map(normalize));
    expect(filtered.actions.length).toEqual(2);
  });

  it('works with two filters', () => {
    const tree = new HostTree();
    tree.create('/file1', '');
    tree.create('/file2', '');
    tree.create('/file3', '');

    const filtered = new FilterHostTree(tree, p => p != '/file2');
    const filtered2 = new FilterHostTree(filtered, p => p != '/file3');
    const filteredFiles: string[] = [];
    filtered2.visit(path => filteredFiles.push(path));
    expect(filteredFiles.sort()).toEqual(['/file1'].map(normalize));
    expect(filtered2.actions.map(a => a.kind)).toEqual(['c']);
  });

  it('works with underlying files', () => {
    const fs = new virtualFs.test.TestHost({
      '/file1': '',
    });
    const tree = new HostTree(fs);
    tree.create('/file2', '');
    tree.create('/file3', '');

    const filtered = new FilterHostTree(tree, p => p != '/file2');
    const filtered2 = new FilterHostTree(filtered, p => p != '/file3');
    const filteredFiles: string[] = [];
    filtered2.visit(path => filteredFiles.push(path));
    expect(filteredFiles.sort()).toEqual(['/file1'].map(normalize));
    expect(filtered2.actions.map(a => a.kind)).toEqual([]);
  });

  it('works with created paths and files', () => {
    const tree = new HostTree();
    tree.create('/dir1/file1', '');
    tree.create('/dir2/file2', '');
    tree.create('/file3', '');

    const filtered = new FilterHostTree(tree, p => p != '/dir2/file2');
    const filtered2 = new FilterHostTree(filtered, p => p != '/file3');
    const filteredFiles: string[] = [];
    filtered2.visit(path => filteredFiles.push(path));
    expect(filteredFiles.sort()).toEqual(['/dir1/file1'].map(normalize));
    expect(filtered2.actions.map(a => a.kind)).toEqual(['c']);
  });

  it('works with underlying paths and files', () => {
    const fs = new virtualFs.test.TestHost({
      '/dir1/file1': '',
      '/dir2/file2': '',
    });
    const tree = new HostTree(fs);
    tree.create('/file3', '');

    const filtered = new FilterHostTree(tree, p => p != '/dir2/file2');
    const filtered2 = new FilterHostTree(filtered, p => p != '/file3');
    const filteredFiles: string[] = [];
    filtered2.visit(path => filteredFiles.push(path));
    expect(filteredFiles.sort()).toEqual(['/dir1/file1'].map(normalize));
    expect(filtered2.actions.map(a => a.kind)).toEqual([]);
  });
});
