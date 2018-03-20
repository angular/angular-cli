/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host, runTargetSpec } from '../utils';


describe('Browser Builder optimization level', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    const overrides = { optimizationLevel: 1 };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
        // Bundle contents should be uglified, which includes variable mangling.
        expect(content).not.toContain('AppComponent');
      }),
    ).subscribe(undefined, done.fail, done);
  }, 45000);

  it('tsconfig target changes optimizations to use ES2015', (done) => {
    host.replaceInFile('tsconfig.json', '"target": "es5"', '"target": "es2015"');

    const overrides = { optimizationLevel: 1 };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'vendor.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
        expect(content).toMatch(/class \w{constructor\(\){/);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 45000);
});
