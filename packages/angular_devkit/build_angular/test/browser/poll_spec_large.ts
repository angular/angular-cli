/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { debounceTime, take, tap } from 'rxjs/operators';
import { createArchitect, host } from '../utils';


describe('Browser Builder poll', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const overrides = { watch: true, poll: 10000 };
    const intervals: number[] = [];
    let startTime: number | undefined;

    const run = await architect.scheduleTarget(target, overrides);
    await run.output.pipe(
      // Debounce 1s, otherwise changes are too close together and polling doesn't work.
      debounceTime(1000),
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(true);
        if (startTime != undefined) {
          intervals.push(Date.now() - startTime - 1000);
        }
        startTime = Date.now();
        host.appendToFile('src/main.ts', 'console.log(1);');
      }),
      take(4),
    ).toPromise();

    intervals.sort();
    const median = intervals[Math.trunc(intervals.length / 2)];
    expect(median).toBeGreaterThan(3000);
    expect(median).toBeLessThan(12000);
  });
});
