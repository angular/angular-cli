/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { angularHost, basicHost } from '../test-utils';


describe('Webpack Builder basic test', () => {
  describe('basic app', () => {
    const outputPath = normalize('dist');
    const webpackTargetSpec = { project: 'app', target: 'build' };

    beforeEach(done => basicHost.initialize().toPromise().then(done, done.fail));
    afterEach(done => basicHost.restore().toPromise().then(done, done.fail));

    it('works', (done) => {
      runTargetSpec(basicHost, webpackTargetSpec).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        tap(() => {
          expect(basicHost.scopedSync().exists(join(outputPath, 'bundle.js'))).toBe(true);
        }),
      ).toPromise().then(done, done.fail);
    });
  });

  describe('Angular app', () => {
    const outputPath = normalize('dist/');
    const webpackTargetSpec = { project: 'app', target: 'build-webpack' };

    beforeEach(done => angularHost.initialize().toPromise().then(done, done.fail));
    afterEach(done => angularHost.restore().toPromise().then(done, done.fail));

    it('works', (done) => {
      runTargetSpec(angularHost, webpackTargetSpec).pipe(
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        tap(() => {
          expect(angularHost.scopedSync().exists(join(outputPath, 'main.js'))).toBe(true);
          expect(angularHost.scopedSync().exists(join(outputPath, 'polyfills.js'))).toBe(true);
        }),
      ).toPromise().then(done, done.fail);
    });
  });
});
