/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {SchematicDescription} from './interface';
import {SchematicImpl} from './schematic';
import {MergeStrategy, Tree} from '../tree/interface';
import {branch, empty} from '../tree/static';

import 'rxjs/add/operator/toArray';
import 'rxjs/add/operator/toPromise';
import {Observable} from 'rxjs/Observable';


const engine = {
  defaultMergeStrategy: MergeStrategy.Default
} as any;


describe('Schematic', () => {
  it('works with a rule', done => {
    let inner: any = null;
    const desc: SchematicDescription<any, any> = {
      name: 'test',
      description: '',
      path: 'a/b/c',
      factory: () => (tree: Tree) => {
        inner = branch(tree);
        tree.create('a/b/c', 'some content');
        return tree;
      }
    };

    const schematic = new SchematicImpl(desc, desc.factory, null !, engine);
    schematic.call({}, Observable.of(empty()))
      .toPromise()
      .then(x => {
        expect(inner.files).toEqual([]);
        expect(x.files).toEqual(['/a/b/c']);
      })
      .then(done, done.fail);
  });

  it('works with a rule that returns an observable', done => {
    let inner: any = null;
    const desc: SchematicDescription<any, any> = {
      name: 'test',
      description: '',
      path: 'a/b/c',
      factory: () => (fem: Tree) => {
        inner = fem;
        return Observable.of(empty());
      }
    };


    const schematic = new SchematicImpl(desc, desc.factory, null !, engine);
    schematic.call({}, Observable.of(empty()))
      .toPromise()
      .then(x => {
        expect(inner.files).toEqual([]);
        expect(x.files).toEqual([]);
        expect(inner).not.toBe(x);
      })
      .then(done, done.fail);
  });

});
