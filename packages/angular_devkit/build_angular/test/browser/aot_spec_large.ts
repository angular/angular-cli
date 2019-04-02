/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { BrowserBuilderOutput } from '../../src/browser';
import { createArchitect, host } from '../utils';


describe('Browser Builder AOT', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const overrides = { aot: true };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = await run.result as BrowserBuilderOutput;

    expect(output.success).toBe(true);

    const fileName = join(normalize(output.outputPath), 'main.js');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toMatch(/platformBrowser.*bootstrapModuleFactory.*AppModuleNgFactory/);

    await run.stop();
  });
});
