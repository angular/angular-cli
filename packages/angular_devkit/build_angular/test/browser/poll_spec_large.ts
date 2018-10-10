/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { debounceTime, take, tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder poll', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const overrides = { watch: true, poll: 10000 };
    const intervals: number[] = [];
    let startTime: number | undefined;
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
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
    ).subscribe(undefined, done.fail, () => {
      intervals.sort();
      const median = intervals[Math.trunc(intervals.length / 2)];
      expect(median).toBeGreaterThan(3000);
      expect(median).toBeLessThan(12000);
      done();
    });
  });
});
