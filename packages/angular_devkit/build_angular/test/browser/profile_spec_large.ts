/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { normalize } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder profile', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const overrides = { profile: true };
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists(normalize('chrome-profiler-events.json'))).toBe(true);
        expect(host.scopedSync().exists(normalize('speed-measure-plugin.json'))).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  });
});
