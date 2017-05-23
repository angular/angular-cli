import {apply, callRule, callSource, chain} from './base';
import {Rule, SchematicContext, Source} from '../engine/interface';
import {Tree} from '../tree/interface';
import {empty} from '../tree/static';

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/toPromise';



const context: SchematicContext = null !;


describe('chain', () => {
  it('works with simple rules', done => {
    const rulesCalled: Tree[] = [];

    const tree0 = empty();
    const tree1 = empty();
    const tree2 = empty();
    const tree3 = empty();

    const rule0: Rule = (tree: Tree) => { rulesCalled[0] = tree; return tree1; };
    const rule1: Rule = (tree: Tree) => { rulesCalled[1] = tree; return tree2; };
    const rule2: Rule = (tree: Tree) => { rulesCalled[2] = tree; return tree3; };

    callRule(chain([ rule0, rule1, rule2 ]), Observable.of(tree0), context)
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

    const rule0: Rule = (tree: Tree) => { rulesCalled[0] = tree; return Observable.of(tree1); };
    const rule1: Rule = (tree: Tree) => { rulesCalled[1] = tree; return Observable.of(tree2); };
    const rule2: Rule = (tree: Tree) => { rulesCalled[2] = tree; return tree3; };

    callRule(chain([ rule0, rule1, rule2 ]), Observable.of(tree0), context)
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

    const source: Source = () => { sourceCalled = true; return tree0; };
    const rule0: Rule = (tree: Tree) => { rulesCalled[0] = tree; return tree1; };
    const rule1: Rule = (tree: Tree) => { rulesCalled[1] = tree; return tree2; };
    const rule2: Rule = (tree: Tree) => { rulesCalled[2] = tree; return tree3; };

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

    const source: Source = () => { sourceCalled = true; return tree0; };
    const rule0: Rule = (tree: Tree) => { rulesCalled[0] = tree; return Observable.of(tree1); };
    const rule1: Rule = (tree: Tree) => { rulesCalled[1] = tree; return Observable.of(tree2); };
    const rule2: Rule = (tree: Tree) => { rulesCalled[2] = tree; return tree3; };

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
