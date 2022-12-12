/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { SchematicContext } from '../engine/interface';
import { HostTree } from '../tree/host-tree';
import { callRule } from './call';
import { move } from './move';

const context: SchematicContext = null!;

describe('move', () => {
  it('works on moving the whole structure', async () => {
    const tree = new HostTree();
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/c/file3', 'hello world');

    const result = await callRule(move('sub'), tree, context);
    expect(result.exists('sub/a/b/file1')).toBe(true);
    expect(result.exists('sub/a/b/file2')).toBe(true);
    expect(result.exists('sub/a/c/file3')).toBe(true);
  });

  it('works on moving a subdirectory structure', async () => {
    const tree = new HostTree();
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/c/file3', 'hello world');

    const result = await callRule(move('a/b', 'sub'), tree, context);
    expect(result.exists('sub/file1')).toBe(true);
    expect(result.exists('sub/file2')).toBe(true);
    expect(result.exists('a/c/file3')).toBe(true);
  });

  it('works on moving a directory into a subdirectory of itself', async () => {
    const tree = new HostTree();
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/c/file3', 'hello world');

    const result = await callRule(move('a/b', 'a/b/c'), tree, context);
    expect(result.exists('a/b/c/file1')).toBe(true);
    expect(result.exists('a/b/c/file2')).toBe(true);
    expect(result.exists('a/c/file3')).toBe(true);
  });

  it('works on moving a directory into a parent of itself', async () => {
    const tree = new HostTree();
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/c/file3', 'hello world');

    const result = await callRule(move('a/b', 'a'), tree, context);
    expect(result.exists('file1')).toBe(false);
    expect(result.exists('file2')).toBe(false);
    expect(result.exists('a/file1')).toBe(true);
    expect(result.exists('a/file2')).toBe(true);
    expect(result.exists('a/c/file3')).toBe(true);
  });

  it('becomes a noop with identical from and to', async () => {
    const tree = new HostTree();
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/c/file3', 'hello world');

    const result = await callRule(move(''), tree, context);
    expect(result.exists('a/b/file1')).toBe(true);
    expect(result.exists('a/b/file2')).toBe(true);
    expect(result.exists('a/c/file3')).toBe(true);
  });
});
