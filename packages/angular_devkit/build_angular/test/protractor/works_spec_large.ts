/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize } from '@angular-devkit/core';
import { retry } from 'rxjs/operators';
import { host, protractorTargetSpec, runTargetSpec } from '../utils';


// TODO: replace this with an "it()" macro that's reusable globally.
let linuxOnlyIt: typeof it = it;
if (process.platform.startsWith('win')) {
  linuxOnlyIt = xit;
}


describe('Protractor Builder', () => {
  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  linuxOnlyIt('works', (done) => {
    runTargetSpec(host, protractorTargetSpec).pipe(
      retry(3),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  linuxOnlyIt('works with no devServerTarget', (done) => {
    const overrides = { devServerTarget: undefined };

    runTargetSpec(host, protractorTargetSpec, overrides).pipe(
      // This should fail because no server is available for connection.
    ).subscribe(undefined, done, done.fail);
  }, 30000);

  linuxOnlyIt('overrides protractor specs', (done) => {
    host.scopedSync().rename(normalize('./e2e/app.e2e-spec.ts'),
      normalize('./e2e/renamed-app.e2e-spec.ts'));

    const overrides = { specs: ['./e2e/renamed-app.e2e-spec.ts'] };

    runTargetSpec(host, protractorTargetSpec, overrides).pipe(
      retry(3),
    ).subscribe(undefined, done.fail, done);
  }, 60000);

  linuxOnlyIt('overrides protractor suites', (done) => {
    host.scopedSync().rename(normalize('./e2e/app.e2e-spec.ts'),
      normalize('./e2e/renamed-app.e2e-spec.ts'));

    // Suites block need to be added in the protractor.conf.js file to test suites
    host.replaceInFile('protractor.conf.js', `allScriptsTimeout: 11000,`, `
      allScriptsTimeout: 11000,
      suites: {
        app: './e2e/app.e2e-spec.ts'
      },
    `);

    const overrides = { suite: 'app' };

    runTargetSpec(host, protractorTargetSpec, overrides).pipe(
      retry(3),
    ).subscribe(undefined, done.fail, done);
  }, 60000);

  // TODO: test `element-explorer` when the protractor builder emits build events with text.
  // .then(() => execAndWaitForOutputToMatch('ng', ['e2e', '--element-explorer'],
  // /Element Explorer/))
  // .then(() => killAllProcesses(), (err: any) => {
  //   killAllProcesses();
  //   throw err;
  // })
});
