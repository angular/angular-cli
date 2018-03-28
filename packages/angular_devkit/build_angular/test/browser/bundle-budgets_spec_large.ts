/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tap } from 'rxjs/operators';
import { TestLogger, Timeout, browserTargetSpec, host, runTargetSpec } from '../utils';


describe('Browser Builder bundle budgets', () => {

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('accepts valid bundles', (done) => {
    const overrides = {
      optimization: true,
      budgets: [{ type: 'allScript', maximumError: '100mb' }],
    };

    const logger = new TestLogger('rebuild-type-errors');

    runTargetSpec(host, browserTargetSpec, overrides, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(logger.includes('WARNING')).toBe(false)),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Complex);

  it('shows errors', (done) => {
    const overrides = {
      optimization: true,
      budgets: [{ type: 'all', maximumError: '100b' }],
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Standard);

  it('shows warnings', (done) => {
    const overrides = {
      optimization: true,
      budgets: [{ type: 'all', minimumWarning: '100mb' }],
    };

    const logger = new TestLogger('rebuild-type-errors');

    runTargetSpec(host, browserTargetSpec, overrides, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(logger.includes('WARNING')).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Standard);
});
