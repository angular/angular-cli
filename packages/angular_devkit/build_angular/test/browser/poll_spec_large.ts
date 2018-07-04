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
    const overrides = { watch: true, poll: 1000 };
    let msAvg = 1000;
    let lastTime: number;
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      // Debounce 1s, otherwise changes are too close together and polling doesn't work.
      debounceTime(1000),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const currTime = Date.now();
        if (lastTime) {
          const ms = Math.floor((currTime - lastTime));
          msAvg = (msAvg + ms) / 2;
        }
        lastTime = currTime;
        host.appendToFile('src/main.ts', 'console.log(1);');
      }),
      take(5),
    ).subscribe(undefined, done.fail, () => {
      // Check if the average is between 1750 and 2750, allowing for a 1000ms variance.
      expect(msAvg).toBeGreaterThan(1750);
      expect(msAvg).toBeLessThan(2750);
      done();
    });
  });
});
