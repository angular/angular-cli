/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { JsonObject, normalize } from '@angular-devkit/core';
import { createArchitect, host, protractorTargetSpec } from '../utils';

describe('Protractor Builder', () => {
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(() => host.restore().toPromise());

  it('executes tests with automatic dev server usage', async () => {
    const run = await architect.scheduleTarget(protractorTargetSpec);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  }, 30000);

  it('fails with no devServerTarget and no standalone server', async () => {
    const overrides = { devServerTarget: undefined } as unknown as JsonObject;
    const run = await architect.scheduleTarget(protractorTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: false }));

    await run.stop();
  }, 30000);

  it('overrides protractor specs', async () => {
    host.scopedSync().rename(
      normalize('./e2e/app.e2e-spec.ts'),
      normalize('./e2e/renamed-app.e2e.spec.ts'),
    );

    const overrides = { specs: ['./e2e/renamed-app.e2e.spec.ts'] };
    const run = await architect.scheduleTarget(protractorTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  }, 60000);

  it('overrides protractor suites', async () => {
    host.scopedSync().rename(
      normalize('./e2e/app.e2e-spec.ts'),
      normalize('./e2e/renamed-app.e2e-spec.ts'),
    );

    // Suites block needs to be added in the protractor.conf.js file to test suites
    host.replaceInFile('protractor.conf.js', `allScriptsTimeout: 11000,`, `
      allScriptsTimeout: 11000,
      suites: {
        app: './e2e/app.e2e-spec.ts'
      },
    `);

    const overrides = { suite: 'app' };
    const run = await architect.scheduleTarget(protractorTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  }, 60000);

  it('supports automatic port assignment (port = 0)', async () => {
    const overrides = { port: 0 };
    const run = await architect.scheduleTarget(protractorTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  }, 30000);

  it('supports dev server builder with browser builder base HREF option', async () => {
    host.replaceInFile(
      'angular.json',
      '"main": "src/main.ts",',
      '"main": "src/main.ts", "baseHref": "/base/",',
    );
    // Need to reset architect to use the modified config
    architect = (await createArchitect(host.root())).architect;

    const run = await architect.scheduleTarget(protractorTargetSpec);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();
  }, 30000);

});
