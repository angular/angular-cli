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
import { browserBuild, createArchitect, host } from '../utils';


describe('Browser Builder profile', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const run = await architect.scheduleTarget(target, { profile: true });
    const output = await run.result as BrowserBuilderOutput;

    expect(output.success).toBe(true);

    const speedMeasureLogPath = normalize('speed-measure-plugin.json');
    expect(host.scopedSync().exists(normalize('chrome-profiler-events.json'))).toBe(true);
    expect(host.scopedSync().exists(speedMeasureLogPath)).toBe(true);

    const content = virtualFs.fileBufferToString(host.scopedSync().read(speedMeasureLogPath));
    expect(content).toContain('plugins');
    await run.stop();
  });
});
