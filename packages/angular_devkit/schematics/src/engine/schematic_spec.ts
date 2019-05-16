/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-non-null-assertion
import { logging } from '@angular-devkit/core';
import { of as observableOf } from 'rxjs';
import { chain } from '../rules/base';
import { MergeStrategy, Tree } from '../tree/interface';
import { branch, empty } from '../tree/static';
import { CollectionDescription, Engine, Rule, Schematic, SchematicDescription } from './interface';
import { SchematicImpl } from './schematic';


type CollectionT = {
  description: string;
};
type SchematicT = {
  collection: CollectionT;
  description: string;
  path: string;
  factory: <T>(options: T) => Rule;
};

const context = {
  debug: false,
  logger: new logging.NullLogger(),
  strategy: MergeStrategy.Default,
};
const engine: Engine<CollectionT, SchematicT> = {
  createContext: (schematic: Schematic<{}, {}>) => ({ engine, schematic, ...context }),
  transformOptions: (_: {}, options: {}) => observableOf(options),
  defaultMergeStrategy: MergeStrategy.Default,
} as {} as Engine<CollectionT, SchematicT>;
const collection = {
  name: 'collection',
  description: 'description',
} as CollectionDescription<CollectionT>;


function files(tree: Tree) {
  const files: string[] = [];
  tree.visit(x => files.push(x));

  return files;
}


describe('Schematic', () => {
  it('works with a rule', done => {
    let inner: Tree | null = null;
    const desc: SchematicDescription<CollectionT, SchematicT> = {
      collection,
      name: 'test',
      description: '',
      path: '/a/b/c',
      factory: () => (tree: Tree) => {
        inner = branch(tree);
        tree.create('a/b/c', 'some content');

        return tree;
      },
    };

    const schematic = new SchematicImpl(desc, desc.factory, null !, engine);
    schematic.call({}, observableOf(empty()))
      .toPromise()
      .then(x => {
        expect(files(inner !)).toEqual([]);
        expect(files(x)).toEqual(['/a/b/c']);
      })
      .then(done, done.fail);
  });

  it('works with a rule that returns an observable', done => {
    let inner: Tree | null = null;
    const desc: SchematicDescription<CollectionT, SchematicT> = {
      collection,
      name: 'test',
      description: '',
      path: 'a/b/c',
      factory: () => (fem: Tree) => {
        inner = fem;

        return observableOf(empty());
      },
    };


    const schematic = new SchematicImpl(desc, desc.factory, null !, engine);
    schematic.call({}, observableOf(empty()))
      .toPromise()
      .then(x => {
        expect(files(inner !)).toEqual([]);
        expect(files(x)).toEqual([]);
        expect(inner).not.toBe(x);
      })
      .then(done, done.fail);
  });

  it('works with nested chained function rules', done => {
    let chainCount = 0;
    let oneCount = 0;
    let twoCount = 0;
    let threeCount = 0;
    const one = () => {
      return chain([
        () => { oneCount++; },
      ]);
    };
    const two = () => {
      return chain([
        () => { twoCount++; },
      ]);
    };
    const three = () => {
      threeCount++;
    };

    const desc: SchematicDescription<CollectionT, SchematicT> = {
      collection,
      name: 'test',
      description: '',
      path: '/a/b/c',
      factory: () => {
        return chain([
          () => { chainCount++; },
          one,
          two,
          three,
        ]);
      },
    };

    const schematic = new SchematicImpl(desc, desc.factory, null !, engine);
    schematic.call({}, observableOf(empty()))
      .toPromise()
      .then(_x => {
        expect(chainCount).toBe(1);
        expect(oneCount).toBe(1);
        expect(twoCount).toBe(1);
        expect(threeCount).toBe(1);
      })
      .then(done, done.fail);
  });

  it('can be called with a scope', done => {
    const desc: SchematicDescription<CollectionT, SchematicT> = {
      collection,
      name: 'test',
      description: '',
      path: '/a/b/c',
      factory: () => (tree: Tree) => {
        tree.create('a/b/c', 'some content');
      },
    };

    const schematic = new SchematicImpl(desc, desc.factory, null !, engine);
    schematic.call({}, observableOf(empty()), {}, { scope: 'base' })
      .toPromise()
      .then(x => {
        expect(files(x)).toEqual(['/base/a/b/c']);
      })
      .then(done, done.fail);
  });

});
