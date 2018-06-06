/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { Timeout, browserTargetSpec, host } from '../utils';


describe('Browser Builder output path', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('deletes output path', (done) => {
    // Write a file to the output path to later verify it was deleted.
    host.scopedSync().write(join(outputPath, 'file.txt'), virtualFs.stringToFileBuffer('file'));
    // Delete an app file to force a failed compilation.
    // Failed compilations still delete files, but don't output any.
    host.delete(join(host.root(), 'src', 'app', 'app.component.ts')).subscribe({
      error: done.fail,
    });

    runTargetSpec(host, browserTargetSpec).pipe(
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(false);
        expect(host.scopedSync().exists(outputPath)).toBe(false);
      }),
    ).toPromise().then(done, done.fail);
  }, Timeout.Basic);

  it('does not allow output path to be project root', (done) => {
    const overrides = { outputPath: './' };

    runTargetSpec(host, browserTargetSpec, overrides)
      .subscribe(undefined, () => done(), done.fail);
  }, Timeout.Basic);
});
