/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect/src/index2';
import { Subject } from 'rxjs';
import { debounceTime, delay, takeUntil, takeWhile, tap } from 'rxjs/operators';
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

    const run = await architect.scheduleTarget(karmaTargetSpec, { watch: true });

    await run.output.pipe(
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
    ).toPromise().catch(() => fail(`stuck at phase ${phase} [builds: ${buildCount}]`));

    await run.stop();
  });

  it('does not rebuild when nothing changed', async () => {
    let buildCount = 0;
    let phase = 1;

    const stopSubject = new Subject();
    const stop$ = stopSubject.asObservable().pipe(delay(5000));

    const run = await architect.scheduleTarget(karmaTargetSpec, { watch: true });

    await run.output.pipe(
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
    ).toPromise().catch(() => fail(`stuck at phase ${phase} [builds: ${buildCount}]`));

    await run.stop();
  });
});
