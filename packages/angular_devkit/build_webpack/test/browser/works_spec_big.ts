/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize } from '@angular-devkit/core';
import { concatMap, tap } from 'rxjs/operators';
import { TestProjectHost, browserWorkspaceTarget, makeWorkspace, workspaceRoot } from '../utils';


describe('Browser Builder', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget())),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        // Default files should be in outputPath.
        expect(host.asSync().exists(join(outputPath, 'inline.bundle.js'))).toBe(true);
        expect(host.asSync().exists(join(outputPath, 'main.bundle.js'))).toBe(true);
        expect(host.asSync().exists(join(outputPath, 'polyfills.bundle.js'))).toBe(true);
        expect(host.asSync().exists(join(outputPath, 'styles.bundle.js'))).toBe(true);
        expect(host.asSync().exists(join(outputPath, 'vendor.bundle.js'))).toBe(true);
        expect(host.asSync().exists(join(outputPath, 'favicon.ico'))).toBe(true);
        expect(host.asSync().exists(join(outputPath, 'index.html'))).toBe(true);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
