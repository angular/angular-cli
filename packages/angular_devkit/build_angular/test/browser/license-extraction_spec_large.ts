/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DefaultTimeout, runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder license extraction', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  // Ignored because license works when trying manually on a project, but doesn't work here.
  // TODO: fix VFS use in webpack and the test host, and reenable this test.
  xit('works', (done) => {
    // TODO: make license extraction independent from optimization level.
    const overrides = { extractLicenses: true, optimization: true };

    runTargetSpec(host, browserTargetSpec, overrides, DefaultTimeout * 2).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, '3rdpartylicenses.txt');
        expect(host.scopedSync().exists(fileName)).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  });
});
