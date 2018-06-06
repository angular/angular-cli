/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import * as path from 'path';
import { tap } from 'rxjs/operators';
import { Timeout, browserTargetSpec, host } from '../utils';

describe('Browser Builder external source map', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const overrides = { sourceMap: true, vendorSourceMap: true };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'vendor.js.map');
        expect(host.scopedSync().exists(fileName)).toBe(true);
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        // this is due the fact that some vendors like `tslib` sourcemaps to js files
        const sourcePath = JSON.parse(content).sources[0];
        expect(path.extname(sourcePath)).toBe('.ts', `${sourcePath} extention should be '.ts'`);
      }),
    ).toPromise().then(done, done.fail);
  }, Timeout.Basic);

  it('does not map sourcemaps from external library when disabled', (done) => {
    const overrides = { sourceMap: true, vendorSourceMap: false };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'vendor.js.map');
        expect(host.scopedSync().exists(fileName)).toBe(true);
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        // this is due the fact that some vendors like `tslib` sourcemaps to js files
        const sourcePath = JSON.parse(content).sources[0];
        expect(path.extname(sourcePath)).toBe('.js', `${sourcePath} extention should be '.js'`);
      }),
    ).toPromise().then(done, done.fail);
  }, Timeout.Basic);

});
