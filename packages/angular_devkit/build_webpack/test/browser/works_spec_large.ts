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


describe('Browser Builder', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    runTargetSpec(host, browserTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        // Default files should be in outputPath.
        expect(host.scopedSync().exists(join(outputPath, 'runtime.js'))).toBe(true);
        expect(host.scopedSync().exists(join(outputPath, 'main.js'))).toBe(true);
        expect(host.scopedSync().exists(join(outputPath, 'polyfills.js'))).toBe(true);
        expect(host.scopedSync().exists(join(outputPath, 'styles.js'))).toBe(true);
        expect(host.scopedSync().exists(join(outputPath, 'vendor.js'))).toBe(true);
        expect(host.scopedSync().exists(join(outputPath, 'favicon.ico'))).toBe(true);
        expect(host.scopedSync().exists(join(outputPath, 'index.html'))).toBe(true);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
