/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { normalize } from '@angular-devkit/core';
import { concatMap, debounceTime, take, tap } from 'rxjs/operators';
import { TestProjectHost, browserWorkspaceTarget, makeWorkspace, workspaceRoot } from '../utils';


describe('Browser Builder poll', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    const overrides = { watch: true, poll: 1000 };
    let msAvg = 1000;
    let lastTime: number;
    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
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
  }, 30000);
});
