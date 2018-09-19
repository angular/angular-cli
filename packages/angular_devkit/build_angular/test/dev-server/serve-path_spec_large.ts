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


describe('Dev Server Builder serve path', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  // TODO: review this test, it seems to pass with or without the servePath.
  it('works', (done) => {
    const overrides: Partial<DevServerBuilderOptions> = { servePath: 'test/' };

    runTargetSpec(host, devServerTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      concatMap(() => from(request('http://localhost:4200/test/'))),
      tap(response => expect(response).toContain('<title>HelloWorldApp</title>')),
      concatMap(() => from(request('http://localhost:4200/test/abc/'))),
      tap(response => expect(response).toContain('<title>HelloWorldApp</title>')),
      take(1),
    ).toPromise().then(done, done.fail);
  }, 30000);
});
