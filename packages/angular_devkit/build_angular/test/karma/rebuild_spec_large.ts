/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { Subject, timer } from 'rxjs';
import {
  catchError,
  debounceTime,
  delay,
  map,
  switchMap,
  takeUntil,
  takeWhile,
  tap,
} from 'rxjs/operators';
import { createArchitect, host, karmaTargetSpec } from '../utils';

describe('Karma Builder watch mode', () => {
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(() => host.restore().toPromise());

  it('performs initial build', async () => {
    const run = await architect.scheduleTarget(karmaTargetSpec, { watch: true });

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  });

  it('recovers from compilation failures in watch mode', async () => {
    let buildCount = 0;
    let phase = 1;

    // The current linux-based CI environments may not fully settled in regards to filesystem
    // changes from previous tests which reuse the same directory and fileset.
    // The initial delay helps mitigate false positive rebuild triggers in such scenarios.
    const { run } = await timer(1000).pipe(
      switchMap(() => architect.scheduleTarget(karmaTargetSpec, { watch: true })),
      switchMap(run => run.output.pipe(map(output => ({ run, output })))),
      debounceTime(500),
      tap(({ output }) => {
        buildCount += 1;
        switch (phase) {
          case 1:
            // Karma run should succeed.
            // Add a compilation error.
            expect(output.success).toBe(true);
            // Add an syntax error to a non-main file.
            host.appendToFile('src/app/app.component.spec.ts', `]]]`);
            phase = 2;
            break;

          case 2:
            // Karma run should fail due to compilation error. Fix it.
            expect(output.success).toBe(false);
            host.replaceInFile('src/app/app.component.spec.ts', `]]]`, '');
            phase = 3;
            break;

          case 3:
            // Karma run should succeed again.
            expect(output.success).toBe(true);
            phase = 4;
            break;
        }
      }),
      takeWhile(() => phase < 4),
      catchError((_, caught) => {
        fail(`stuck at phase ${phase} [builds: ${buildCount}]`);

        return caught;
      }),
    ).toPromise();

    await run.stop();
  });

  it('does not rebuild when nothing changed', async () => {
    let phase = 1;

    const stopSubject = new Subject();
    const stop$ = stopSubject.asObservable().pipe(delay(5000));

    // The current linux-based CI environments may not fully settled in regards to filesystem
    // changes from previous tests which reuse the same directory and fileset.
    // The initial delay helps mitigate false positive rebuild triggers in such scenarios.
    const { run } = await timer(1000).pipe(
      switchMap(() => architect.scheduleTarget(karmaTargetSpec, { watch: true })),
      switchMap(run => run.output.pipe(map(output => ({ run, output })))),
      debounceTime(500),
      tap(({ output }) => {
        switch (phase) {
          case 1:
            // Karma run should succeed.
            expect(output.success).toBe(true);
            // Touch the file.
            host.appendToFile('src/app/app.component.spec.ts', ``);
            // Signal the stopper, which delays emission by 5s.
            // If there's no rebuild within that time then the test is successful.
            stopSubject.next();
            phase = 2;
            break;

          case 2:
            // Should never trigger this second build.
            fail('Should not trigger second build.');
            break;
        }
      }),
      takeUntil(stop$),
    ).toPromise();

    await run.stop();
  });
});
