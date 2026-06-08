/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { of as observableOf } from 'rxjs';
import { Rule, SchematicContext, Source } from '../engine/interface';
import { MergeStrategy, Tree } from '../tree/interface';
import { empty } from '../tree/static';
import {
  InvalidRuleResultException,
  InvalidSourceResultException,
  callRule,
  callSource,
} from './call';

const context: SchematicContext = {
  engine: null,
  debug: false,
  strategy: MergeStrategy.Default,
} as {} as SchematicContext;

describe('callSource', () => {
  it('errors if undefined source', async () => {
    const source0: any = () => undefined;

    await expectAsync(callSource(source0, context).toPromise()).toBeRejectedWithError(
      InvalidSourceResultException,
    );
  });

  it('errors if invalid source object', async () => {
    const source0: Source = () => ({}) as Tree;

    await expectAsync(callSource(source0, context).toPromise()).toBeRejectedWithError(
      InvalidSourceResultException,
    );
  });

  it('errors if Observable of invalid source object', async () => {
    const source0: Source = () => observableOf({} as Tree);

    await expectAsync(callSource(source0, context).toPromise()).toBeRejectedWithError(
      InvalidSourceResultException,
    );
  });

  it('works with a Tree', async () => {
    const tree0 = empty();
    const source0: Source = () => tree0;
    const tree = await callSource(source0, context).toPromise();
    expect(tree).toBe(tree0);
  });

  it('works with an Observable', async () => {
    const tree0 = empty();
    const source0: Source = () => observableOf(tree0);
    const tree = await callSource(source0, context).toPromise();
    expect(tree).toBe(tree0);
  });
});

describe('callRule', () => {
  it('should throw InvalidRuleResultException when rule result is non-Tree object', async () => {
    const rule0: Rule = () => ({}) as Tree;

    await expectAsync(callRule(rule0, empty(), context).toPromise()).toBeRejectedWithError(
      InvalidRuleResultException,
    );
  });

  it('should throw InvalidRuleResultException when rule result is null', async () => {
    const rule0: Rule = () => null as unknown as Tree;

    await expectAsync(callRule(rule0, empty(), context).toPromise()).toBeRejectedWithError(
      InvalidRuleResultException,
    );
  });

  it('works with undefined result', async () => {
    const tree0 = empty();
    const rule0: Rule = () => undefined;
    const tree = await callRule(rule0, observableOf(tree0), context).toPromise();
    expect(tree).toBe(tree0);
  });

  it('works with a Tree', async () => {
    const tree0 = empty();
    const rule0: Rule = () => tree0;
    const tree = await callRule(rule0, observableOf(tree0), context).toPromise();
    expect(tree).toBe(tree0);
  });

  it('works with an Observable', async () => {
    const tree0 = empty();
    const rule0: Rule = () => observableOf(tree0);
    const tree = await callRule(rule0, observableOf(tree0), context).toPromise();
    expect(tree).toBe(tree0);
  });
});
