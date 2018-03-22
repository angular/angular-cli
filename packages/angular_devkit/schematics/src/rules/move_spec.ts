/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:non-null-operator
import { of as observableOf } from 'rxjs';
import { SchematicContext } from '../engine/interface';
import { VirtualTree } from '../tree/virtual';
import { callRule } from './call';
import { move } from './move';


const context: SchematicContext = null !;


describe('move', () => {
  it('works on moving the whole structure', done => {
    const tree = new VirtualTree();
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
    const tree = new VirtualTree();
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
});
