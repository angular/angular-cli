/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { tap } from 'rxjs/operators';
import { host, karmaTargetSpec } from '../utils';


// TODO: replace this with an "it()" macro that's reusable globally.
let linuxOnlyIt: typeof it = it;
if (process.platform.startsWith('win')) {
  linuxOnlyIt = xit;
}

describe('Karma Builder', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('runs', (done) => {
    runTargetSpec(host, karmaTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  // This test seems to succeed on appveyor but not terminate Karma, leaving the port used
  // and killing Chrome after 60s. This causes other tests that use Chrome to fail.
  linuxOnlyIt('fails with broken compilation', (done) => {
    host.writeMultipleFiles({
      'src/app/app.component.spec.ts': '<p> definitely not typescript </p>',
    });
    runTargetSpec(host, karmaTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('supports ES2015 target', (done) => {
    host.replaceInFile('tsconfig.json', '"target": "es5"', '"target": "es2015"');
    runTargetSpec(host, karmaTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);
});
