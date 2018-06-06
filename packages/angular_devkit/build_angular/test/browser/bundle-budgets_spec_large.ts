/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { TestLogger, runTargetSpec } from '@angular-devkit/architect/testing';
import { tap } from 'rxjs/operators';
import { Timeout, browserTargetSpec, host } from '../utils';


describe('Browser Builder bundle budgets', () => {

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('accepts valid bundles', (done) => {
    const overrides = {
      optimization: true,
      budgets: [{ type: 'allScript', maximumError: '100mb' }],
    };

    const logger = new TestLogger('rebuild-type-errors');

    runTargetSpec(host, browserTargetSpec, overrides, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(logger.includes('WARNING')).toBe(false)),
    ).toPromise().then(done, done.fail);
  }, Timeout.Complex);

  it('shows errors', (done) => {
    const overrides = {
      optimization: true,
      budgets: [{ type: 'all', maximumError: '100b' }],
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
    ).toPromise().then(done, done.fail);
  }, Timeout.Complex);

  it('shows warnings', (done) => {
    const overrides = {
      optimization: true,
      budgets: [{ type: 'all', minimumWarning: '100mb' }],
    };

    const logger = new TestLogger('rebuild-type-errors');

    runTargetSpec(host, browserTargetSpec, overrides, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(logger.includes('WARNING')).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, Timeout.Complex);
});
