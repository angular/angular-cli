/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { normalize } from '@angular-devkit/core';
import { concatMap, retry } from 'rxjs/operators';
import {
  TestProjectHost,
  browserWorkspaceTarget,
  devServerWorkspaceTarget,
  makeWorkspace,
  protractorWorkspaceTarget,
  workspaceRoot,
} from '../utils';


describe('Protractor Builder', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    architect.loadWorkspaceFromJson(makeWorkspace([
      browserWorkspaceTarget,
      devServerWorkspaceTarget,
      protractorWorkspaceTarget,
    ])).pipe(
      concatMap(() => architect.run(architect.getTarget())),
      retry(3),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('works with no devServerTarget', (done) => {
    const overrides = { devServerTarget: undefined };

    architect.loadWorkspaceFromJson(makeWorkspace(protractorWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      // This should fail because no server is available for connection.
    ).subscribe(undefined, done, done.fail);
  }, 30000);

  it('picks up changed port in devServer', (done) => {
    const modifiedDevServerTarget = devServerWorkspaceTarget;
    modifiedDevServerTarget.options.port = 4400;
    const workspace = makeWorkspace([
      browserWorkspaceTarget,
      modifiedDevServerTarget,
      protractorWorkspaceTarget,
    ]);

    architect.loadWorkspaceFromJson(workspace).pipe(
      concatMap(() => architect.run(architect.getTarget())),
      retry(3),
    ).subscribe(undefined, done.fail, done);
  }, 60000);

  it('overrides protractor specs', (done) => {
    host.asSync().rename(normalize('./e2e/app.e2e-spec.ts'),
      normalize('./e2e/renamed-app.e2e-spec.ts'));

    const overrides = { specs: ['./e2e/renamed-app.e2e-spec.ts'] };

    architect.loadWorkspaceFromJson(makeWorkspace([
      browserWorkspaceTarget,
      devServerWorkspaceTarget,
      protractorWorkspaceTarget,
    ])).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      retry(3),
    ).subscribe(undefined, done.fail, done);
  }, 60000);

  it('overrides protractor suites', (done) => {
    host.asSync().rename(normalize('./e2e/app.e2e-spec.ts'),
      normalize('./e2e/renamed-app.e2e-spec.ts'));

    // Suites block need to be added in the protractor.conf.js file to test suites
    host.replaceInFile('protractor.conf.js', `allScriptsTimeout: 11000,`, `
      allScriptsTimeout: 11000,
      suites: {
        app: './e2e/app.e2e-spec.ts'
      },
    `);

    const overrides = { suite: 'app' };

    architect.loadWorkspaceFromJson(makeWorkspace([
      browserWorkspaceTarget,
      devServerWorkspaceTarget,
      protractorWorkspaceTarget,
    ])).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
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
