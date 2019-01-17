/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
// tslint:disable:no-non-null-assertion
import { Path, virtualFs } from '@angular-devkit/core';
import {
  HostTree,
  MergeStrategy,
  partitionApplyMerge,
} from '@angular-devkit/schematics';
import { of as observableOf } from 'rxjs';
import { Rule, SchematicContext, Source } from '../engine/interface';
import { Tree } from '../tree/interface';
import { empty } from '../tree/static';
import { apply, applyToSubtree, chain } from './base';
import { callRule, callSource } from './call';
import { move } from './move';


const context: SchematicContext = {
  engine: null,
  debug: false,
  strategy: MergeStrategy.Default,
} as {} as SchematicContext;


describe('chain', () => {
  it('works with simple rules', done => {
    const rulesCalled: Tree[] = [];

    const tree0 = empty();
    const tree1 = empty();
    const tree2 = empty();
    const tree3 = empty();

    const rule0: Rule = (tree: Tree) => (rulesCalled[0] = tree, tree1);
    const rule1: Rule = (tree: Tree) => (rulesCalled[1] = tree, tree2);
    const rule2: Rule = (tree: Tree) => (rulesCalled[2] = tree, tree3);

    callRule(chain([ rule0, rule1, rule2 ]), observableOf(tree0), context)
      .toPromise()
      .then(result => {
        expect(result).not.toBe(tree0);
        expect(rulesCalled[0]).toBe(tree0);
        expect(rulesCalled[1]).toBe(tree1);
        expect(rulesCalled[2]).toBe(tree2);
        expect(result).toBe(tree3);
      })
      .then(done, done.fail);
  });

  it('works with observable rules', done => {
    const rulesCalled: Tree[] = [];

    const tree0 = empty();
    const tree1 = empty();
    const tree2 = empty();
    const tree3 = empty();

    const rule0: Rule = (tree: Tree) => (rulesCalled[0] = tree, observableOf(tree1));
    const rule1: Rule = (tree: Tree) => (rulesCalled[1] = tree, observableOf(tree2));
    const rule2: Rule = (tree: Tree) => (rulesCalled[2] = tree, tree3);

    callRule(chain([ rule0, rule1, rule2 ]), observableOf(tree0), context)
      .toPromise()
      .then(result => {
        expect(result).not.toBe(tree0);
        expect(rulesCalled[0]).toBe(tree0);
        expect(rulesCalled[1]).toBe(tree1);
        expect(rulesCalled[2]).toBe(tree2);
        expect(result).toBe(tree3);
      })
      .then(done, done.fail);
  });
});

describe('apply', () => {
  it('works with simple rules', done => {
    const rulesCalled: Tree[] = [];
    let sourceCalled = false;

    const tree0 = empty();
    const tree1 = empty();
    const tree2 = empty();
    const tree3 = empty();

    const source: Source = () => (sourceCalled = true, tree0);
    const rule0: Rule = (tree: Tree) => (rulesCalled[0] = tree, tree1);
    const rule1: Rule = (tree: Tree) => (rulesCalled[1] = tree, tree2);
    const rule2: Rule = (tree: Tree) => (rulesCalled[2] = tree, tree3);

    callSource(apply(source, [ rule0, rule1, rule2 ]), context)
      .toPromise()
      .then(result => {
        expect(result).not.toBe(tree0);
        expect(rulesCalled[0]).toBe(tree0);
        expect(rulesCalled[1]).toBe(tree1);
        expect(rulesCalled[2]).toBe(tree2);
        expect(result).toBe(tree3);
      })
      .then(done, done.fail);
  });

  it('works with observable rules', done => {
    const rulesCalled: Tree[] = [];
    let sourceCalled = false;

    const tree0 = empty();
    const tree1 = empty();
    const tree2 = empty();
    const tree3 = empty();

    const source: Source = () => (sourceCalled = true, tree0);
    const rule0: Rule = (tree: Tree) => (rulesCalled[0] = tree, observableOf(tree1));
    const rule1: Rule = (tree: Tree) => (rulesCalled[1] = tree, observableOf(tree2));
    const rule2: Rule = (tree: Tree) => (rulesCalled[2] = tree, tree3);

    callSource(apply(source, [ rule0, rule1, rule2 ]), context)
      .toPromise()
      .then(result => {
        expect(result).not.toBe(tree0);
        expect(rulesCalled[0]).toBe(tree0);
        expect(rulesCalled[1]).toBe(tree1);
        expect(rulesCalled[2]).toBe(tree2);
        expect(result).toBe(tree3);
      })
      .then(done, done.fail);
  });
});

describe('partitionApplyMerge', () => {
  it('works with simple rules', done => {
    const host = new virtualFs.test.TestHost({
      '/test1': '',
      '/test2': '',
    });
    const tree = new HostTree(host);
    const predicate = (path: Path) => path.indexOf('1') != -1;

    const ruleYes: Rule = (tree: Tree) => {
      expect(tree.exists('/test1')).toBe(true);
      expect(tree.exists('/test2')).toBe(false);

      return empty();
    };
    const ruleNo: Rule = (tree: Tree) => {
      expect(tree.exists('/test1')).toBe(false);
      expect(tree.exists('/test2')).toBe(true);

      return empty();
    };

    callRule(partitionApplyMerge(predicate, ruleYes, ruleNo), observableOf(tree), context)
      .toPromise()
      .then(result => {
        expect(result.exists('/test1')).toBe(false);
        expect(result.exists('/test2')).toBe(false);
      })
      .then(done, done.fail);
  });
});

describe('applyToSubtree', () => {
  it('works', done => {
    const tree = new HostTree();
    tree.create('a/b/file1', 'hello world');
    tree.create('a/b/file2', 'hello world');
    tree.create('a/c/file3', 'hello world');

    callRule(applyToSubtree('a/b', [move('x')]), observableOf(tree), context)
      .toPromise()
      .then(result => {
        expect(result.exists('a/b/x/file1')).toBe(true);
        expect(result.exists('a/b/x/file2')).toBe(true);
        expect(result.exists('a/c/file3')).toBe(true);
      })
      .then(done, done.fail);
  });
});
