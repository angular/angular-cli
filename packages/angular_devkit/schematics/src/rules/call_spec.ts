/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
  it('errors if undefined source', (done) => {
    const source0: any = () => undefined;

    callSource(source0, context)
      .toPromise()
      .then(
        () => done.fail(),
        (err) => {
          expect(err).toEqual(new InvalidSourceResultException());
        },
      )
      .then(done, done.fail);
  });

  it('errors if invalid source object', (done) => {
    const source0: Source = () => ({}) as Tree;

    callSource(source0, context)
      .toPromise()
      .then(
        () => done.fail(),
        (err) => {
          expect(err).toEqual(new InvalidSourceResultException({}));
        },
      )
      .then(done, done.fail);
  });

  it('errors if Observable of invalid source object', (done) => {
    const source0: Source = () => observableOf({} as Tree);

    callSource(source0, context)
      .toPromise()
      .then(
        () => done.fail(),
        (err) => {
          expect(err).toEqual(new InvalidSourceResultException({}));
        },
      )
      .then(done, done.fail);
  });

  it('works with a Tree', (done) => {
    const tree0 = empty();
    const source0: Source = () => tree0;

    callSource(source0, context)
      .toPromise()
      .then((tree) => {
        expect(tree).toBe(tree0);
      })
      .then(done, done.fail);
  });

  it('works with an Observable', (done) => {
    const tree0 = empty();
    const source0: Source = () => observableOf(tree0);

    callSource(source0, context)
      .toPromise()
      .then((tree) => {
        expect(tree).toBe(tree0);
      })
      .then(done, done.fail);
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

  it('works with undefined result', (done) => {
    const tree0 = empty();
    const rule0: Rule = () => undefined;

    callRule(rule0, observableOf(tree0), context)
      .toPromise()
      .then((tree) => {
        expect(tree).toBe(tree0);
      })
      .then(done, done.fail);
  });

  it('works with a Tree', (done) => {
    const tree0 = empty();
    const rule0: Rule = () => tree0;

    callRule(rule0, observableOf(tree0), context)
      .toPromise()
      .then((tree) => {
        expect(tree).toBe(tree0);
      })
      .then(done, done.fail);
  });

  it('works with an Observable', (done) => {
    const tree0 = empty();
    const rule0: Rule = () => observableOf(tree0);

    callRule(rule0, observableOf(tree0), context)
      .toPromise()
      .then((tree) => {
        expect(tree).toBe(tree0);
      })
      .then(done, done.fail);
  });
});
