/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { debounceTime, take, tap } from 'rxjs/operators';
import { host, karmaTargetSpec } from '../utils';


// Karma watch mode is currently bugged:
// - errors print a huge stack trace
// - karma does not have a way to close the server gracefully.
// TODO: fix these before 6.0 final.
xdescribe('Karma Builder watch mode', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const overrides = { watch: true };
    runTargetSpec(host, karmaTargetSpec, overrides).pipe(
      debounceTime(500),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      take(1),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('recovers from compilation failures in watch mode', (done) => {
    const overrides = { watch: true };
    let buildNumber = 0;

    runTargetSpec(host, karmaTargetSpec, overrides).pipe(
      debounceTime(500),
      tap((buildEvent) => {
        buildNumber += 1;
        switch (buildNumber) {
          case 1:
            // Karma run should succeed.
            // Add a compilation error.
            expect(buildEvent.success).toBe(true);
            host.writeMultipleFiles({
              'src/app/app.component.spec.ts': '<p> definitely not typescript </p>',
            });
            break;

          case 2:
            // Karma run should fail due to compilation error. Fix it.
            expect(buildEvent.success).toBe(false);
            host.writeMultipleFiles({ 'src/foo.spec.ts': '' });
            break;

          case 3:
            // Karma run should succeed again.
            expect(buildEvent.success).toBe(true);
            break;

          default:
            break;
        }
      }),
      take(3),
    ).toPromise().then(done, done.fail);
  }, 30000);
});
