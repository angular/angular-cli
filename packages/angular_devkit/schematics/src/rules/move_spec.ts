/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-non-null-assertion
import { of as observableOf } from 'rxjs';
import { SchematicContext } from '../engine/interface';
import { HostTree } from '../tree/host-tree';
import { callRule } from './call';
import { move } from './move';


const context: SchematicContext = null !;


describe('move', () => {
  it('works on moving the whole structure', done => {
    const tree = new HostTree();
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/c/file3', 'hello world');

    callRule(move('sub'), observableOf(tree), context)
      .toPromise()
      .then(result => {
        expect(result.exists('sub/a/b/file1')).toBe(true);
        expect(result.exists('sub/a/b/file2')).toBe(true);
        expect(result.exists('sub/a/c/file3')).toBe(true);
      })
      .then(done, done.fail);
  });

  it('works on moving a subdirectory structure', done => {
    const tree = new HostTree();
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/c/file3', 'hello world');

    callRule(move('a/b', 'sub'), observableOf(tree), context)
      .toPromise()
      .then(result => {
        expect(result.exists('sub/file1')).toBe(true);
        expect(result.exists('sub/file2')).toBe(true);
        expect(result.exists('a/c/file3')).toBe(true);
      })
      .then(done, done.fail);
  });

  it('works on moving a directory into a subdirectory of itself', done => {
    const tree = new HostTree();
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/c/file3', 'hello world');

    callRule(move('a/b', 'a/b/c'), observableOf(tree), context)
      .toPromise()
      .then(result => {
        expect(result.exists('a/b/c/file1')).toBe(true);
        expect(result.exists('a/b/c/file2')).toBe(true);
        expect(result.exists('a/c/file3')).toBe(true);
      })
      .then(done, done.fail);
  });

  it('works on moving a directory into a parent of itself', done => {
    const tree = new HostTree();
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/c/file3', 'hello world');

    callRule(move('a/b', 'a'), observableOf(tree), context)
      .toPromise()
      .then(result => {
        expect(result.exists('file1')).toBe(false);
        expect(result.exists('file2')).toBe(false);
        expect(result.exists('a/file1')).toBe(true);
        expect(result.exists('a/file2')).toBe(true);
        expect(result.exists('a/c/file3')).toBe(true);
      })
      .then(done, done.fail);
  });

  it('becomes a noop with identical from and to', done => {
    const tree = new HostTree();
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/c/file3', 'hello world');

    callRule(move(''), observableOf(tree), context)
      .toPromise()
      .then(result => {
        expect(result.exists('a/b/file1')).toBe(true);
        expect(result.exists('a/b/file2')).toBe(true);
        expect(result.exists('a/c/file3')).toBe(true);
      })
      .then(done, done.fail);
  });
});
