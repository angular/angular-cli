/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host, runTargetSpec } from '../utils';


describe('Browser Builder license extraction', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  // Ignored because license works when trying manually on a project, but doesn't work here.
  // TODO: fix VFS use in webpack and the test host, and reenable this test.
  xit('works', (done) => {
    // TODO: make license extraction independent from optimization level.
    const overrides = { extractLicenses: true, optimizationLevel: 1 };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, '3rdpartylicenses.txt');
        expect(host.scopedSync().exists(fileName)).toBe(true);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 45000);
});
