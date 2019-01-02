/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DefaultTimeout, TestLogger, runTargetSpec } from '@angular-devkit/architect/testing';
import { concatMap, delay, tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder cache test', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const logger = new TestLogger('persistent-cache');
    const overrides = { persistentCache: true };
    const clearCacheOverrides = { clearPersistentCache: true, ...overrides };
    runTargetSpec(host, browserTargetSpec, clearCacheOverrides, DefaultTimeout, logger).pipe(
      // Wait 20s for cache to be written. See note about cache 'store' property on common.ts.
      delay(20 * 1000),
      concatMap(() => runTargetSpec(host, browserTargetSpec, overrides, DefaultTimeout, logger)),
      // There are 5 chunks total, so the compiler should say nothing changed.
      tap(() => expect(logger.includes('5 unchanged chunks')).toBe(true)),
    ).toPromise().then(done, done.fail);
  });
});
