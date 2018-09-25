/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { request, runTargetSpec } from '@angular-devkit/architect/testing';
import { from } from 'rxjs';
import { concatMap, take, tap } from 'rxjs/operators';
import { DevServerBuilderOptions } from '../../src';
import { devServerTargetSpec, host } from '../utils';


describe('Dev Server Deploy Url', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const overrides: Partial<DevServerBuilderOptions> = { deployUrl: 'test/' };

    runTargetSpec(host, devServerTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      concatMap(() => from(request('http://localhost:4200/test/polyfills.js'))),
      tap(response => expect(response).toContain('window["webpackJsonp"]')),
      take(1),
    ).toPromise().then(done, done.fail);
  }, 30000);
});
