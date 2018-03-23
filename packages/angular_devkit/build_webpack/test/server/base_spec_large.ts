/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { host, runTargetSpec } from '../utils';


describe('Server Builder', () => {
  const outputPath = normalize('dist-server');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works (base)', (done) => {
    const overrides = { };

    runTargetSpec(host, { project: 'app', target: 'server' }, overrides).pipe(
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(true);

        const fileName = join(outputPath, 'main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        expect(content).toMatch(/AppServerModuleNgFactory/);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
