/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DefaultTimeout, runTargetSpec } from '@angular-devkit/architect/testing';
import { Subject } from 'rxjs';
import { debounceTime, delay, take, takeUntil, takeWhile, tap } from 'rxjs/operators';
import { host, karmaTargetSpec } from '../utils';


describe('Karma Builder watch mode', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', async () => {
    const overrides = { watch: true };
    const res = await runTargetSpec(host, karmaTargetSpec, overrides).pipe(
      debounceTime(500),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      take(1),
    ).toPromise();

    expect(res).toEqual({ success: true });
  });

  it('recovers from compilation failures in watch mode', (done) => {
    const overrides = { watch: true };
    let buildCount = 0;
    let phase = 1;

    runTargetSpec(host, karmaTargetSpec, overrides, DefaultTimeout * 3).pipe(
      debounceTime(500),
      tap((buildEvent) => {
        buildCount += 1;
        switch (phase) {
          case 1:
            // Karma run should succeed.
            // Add a compilation error.
            expect(buildEvent.success).toBe(true);
            // Add an syntax error to a non-main file.
            host.appendToFile('src/app/app.component.spec.ts', `]]]`);
            phase = 2;
            break;

          case 2:
            // Karma run should fail due to compilation error. Fix it.
            expect(buildEvent.success).toBe(false);
            host.replaceInFile('src/app/app.component.spec.ts', `]]]`, '');
            phase = 3;
            break;

          case 3:
            // Karma run should succeed again.
            expect(buildEvent.success).toBe(true);
            phase = 4;
            break;
        }
      }),
      takeWhile(() => phase < 4),
    ).toPromise().then(
      () => done(),
      () => done.fail(`stuck at phase ${phase} [builds: ${buildCount}]`),
    );
  });

  it('does not rebuild when nothing changed', (done) => {
    const overrides = { watch: true };
    let buildCount = 0;
    let phase = 1;

    const stopSubject = new Subject();
    const stop$ = stopSubject.asObservable().pipe(delay(5000));

    runTargetSpec(host, karmaTargetSpec, overrides, DefaultTimeout * 3).pipe(
      debounceTime(500),
      tap((buildEvent) => {
        buildCount += 1;
        switch (phase) {
          case 1:
            // Karma run should succeed.
            // Add a compilation error.
            expect(buildEvent.success).toBe(true);
            // Touch the file.
            host.appendToFile('src/app/app.component.spec.ts', ``);
            // Signal the stopper, which delays emission by 5s.
            // If there's no rebuild within that time then the test is successful.
            stopSubject.next();
            phase = 2;
            break;

          case 2:
            // Should never trigger this second build.
            expect(true).toBeFalsy('Should not trigger second build.');
            break;
        }
      }),
      takeUntil(stop$),
    ).toPromise().then(
      () => done(),
      () => done.fail(`stuck at phase ${phase} [builds: ${buildCount}]`),
    );
  });
});
