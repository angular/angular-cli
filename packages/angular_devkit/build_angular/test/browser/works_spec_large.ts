/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { normalize } from '@angular-devkit/core';
import { browserBuild, createArchitect, host } from '../utils';


describe('Browser Builder basic test', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    await browserBuild(architect, host, target);

    // Default files should be in outputPath.
    expect(await host.scopedSync().exists(normalize('dist/runtime.js'))).toBe(true);
    expect(await host.scopedSync().exists(normalize('dist/main.js'))).toBe(true);
    expect(await host.scopedSync().exists(normalize('dist/polyfills.js'))).toBe(true);
    expect(await host.scopedSync().exists(normalize('dist/styles.js'))).toBe(true);
    expect(await host.scopedSync().exists(normalize('dist/vendor.js'))).toBe(true);
    expect(await host.scopedSync().exists(normalize('dist/favicon.ico'))).toBe(true);
    expect(await host.scopedSync().exists(normalize('dist/index.html'))).toBe(true);
  });
});
