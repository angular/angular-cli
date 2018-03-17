/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { TestProjectHost, browserWorkspaceTarget, runTargetSpec, workspaceRoot } from '../utils';


describe('Browser Builder output path', () => {
  const host = new TestProjectHost(workspaceRoot);
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('deletes output path', (done) => {
    // Write a file to the output path to later verify it was deleted.
    host.asSync().write(join(outputPath, 'file.txt'), virtualFs.stringToFileBuffer('file'));
    // Delete an app file to force a failed compilation.
    // Failed compilations still delete files, but don't output any.
    host.asSync().delete(join(workspaceRoot, 'src', 'app', 'app.component.ts'));

    runTargetSpec(host, browserWorkspaceTarget).pipe(
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(false);
        expect(host.asSync().exists(outputPath)).toBe(false);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('does not allow output path to be project root', (done) => {
    const overrides = { outputPath: './' };

    runTargetSpec(host, browserWorkspaceTarget, overrides).subscribe(undefined, done, done.fail);
  }, 30000);
});
