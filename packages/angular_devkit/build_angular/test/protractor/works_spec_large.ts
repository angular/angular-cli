/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { normalize } from '@angular-devkit/core';
import { retry } from 'rxjs/operators';
import { host, protractorTargetSpec } from '../utils';


describe('Protractor Builder', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    runTargetSpec(host, protractorTargetSpec).pipe(
      retry(3),
    ).toPromise().then(done, done.fail);
  }, 30000);

  it('works with no devServerTarget', (done) => {
    const overrides = { devServerTarget: undefined };

    runTargetSpec(host, protractorTargetSpec, overrides).pipe(
      // This should fail because no server is available for connection.
    ).subscribe(undefined, () => done(), done.fail);
  }, 30000);

  it('overrides protractor specs', (done) => {
    host.scopedSync().rename(normalize('./e2e/app.e2e-spec.ts'),
      normalize('./e2e/renamed-app.e2e-spec.ts'));

    const overrides = { specs: ['./e2e/renamed-app.e2e-spec.ts'] };

    runTargetSpec(host, protractorTargetSpec, overrides).pipe(
      retry(3),
    ).toPromise().then(done, done.fail);
  }, 60000);

  it('overrides protractor suites', (done) => {
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
    ).toPromise().then(done, done.fail);
  }, 60000);

  // TODO: test `element-explorer` when the protractor builder emits build events with text.
  // .then(() => execAndWaitForOutputToMatch('ng', ['e2e', '--element-explorer'],
  // /Element Explorer/))
  // .then(() => killAllProcesses(), (err: any) => {
  //   killAllProcesses();
  //   throw err;
  // })
});
