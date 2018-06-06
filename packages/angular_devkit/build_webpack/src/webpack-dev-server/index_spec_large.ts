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
import { basicHost } from '../test-utils';


describe('Dev Server Builder', () => {
  const webpackTargetSpec = { project: 'app', target: 'serve' };

  beforeEach(done => basicHost.initialize().toPromise().then(done, done.fail));
  afterEach(done => basicHost.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    runTargetSpec(basicHost, webpackTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      concatMap(() => from(request('http://localhost:8080/bundle.js'))),
      tap(response => expect(response).toContain(`console.log('hello world')`)),
      take(1),
    ).toPromise().then(done, done.fail);
  }, 30000);
});
