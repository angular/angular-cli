/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { Timeout, browserTargetSpec, host } from '../utils';


describe('Browser Builder source map', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const overrides = { sourceMap: true };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js.map');
        expect(host.scopedSync().exists(fileName)).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  }, Timeout.Basic);

  it('does not output source map when disabled', (done) => {
    const overrides = { sourceMap: false };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js.map');
        expect(host.scopedSync().exists(fileName)).toBe(false);
      }),
    ).toPromise().then(done, done.fail);
  }, Timeout.Basic);

  it('supports eval source map', (done) => {
    const overrides = { sourceMap: true, evalSourceMap: true };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists(join(outputPath, 'main.js.map'))).toBe(false);
        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
        expect(content).toContain('eval("function webpackEmptyAsyncContext');
      }),
    ).toPromise().then(done, done.fail);
  }, Timeout.Basic);
});
