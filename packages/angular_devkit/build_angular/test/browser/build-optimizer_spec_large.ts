/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DefaultTimeout, runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { concatMap, tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder build optimizer', () => {
  const outputPath = normalize('dist');
  const fileName = join(outputPath, 'main.js');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const overrides = { aot: true, buildOptimizer: true };
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).not.toMatch(/\.decorators =/);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('reduces bundle size', (done) => {
    const noBoOverrides = { aot: true, optimization: true, vendorChunk: false };
    const boOverrides = { ...noBoOverrides, buildOptimizer: true };

    let noBoSize: number;
    let boSize: number;

    runTargetSpec(host, browserTargetSpec, noBoOverrides, DefaultTimeout * 3).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const noBoStats = host.scopedSync().stat(normalize(fileName));
        if (!noBoStats) {
          throw new Error('Main file has no stats');
        }
        noBoSize = noBoStats.size;
      }),
      concatMap(() => runTargetSpec(host, browserTargetSpec, boOverrides, DefaultTimeout * 3)),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const boStats = host.scopedSync().stat(normalize(fileName));
        if (!boStats) {
          throw new Error('Main file has no stats');
        }
        boSize = boStats.size;
      }),
      tap(() => {
        const sizeDiff = Math.round(((boSize - noBoSize) / noBoSize) * 10000) / 100;
        if (sizeDiff > -1 && sizeDiff < 0) {
          throw new Error('Total size difference is too small, '
            + 'build optimizer does not seem to have made any optimizations.');
        }

        if (sizeDiff > 1) {
          throw new Error('Total size difference is positive, '
            + 'build optimizer made the bundle bigger.');
        }
      }),
    ).toPromise().then(done, done.fail);
  });
});
