/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize } from '@angular-devkit/core';
import { lastValueFrom } from 'rxjs';
import { browserBuild, createArchitect, host } from '../../../testing/test-utils';
import { BrowserBuilderOutput } from '../index';

describe('Browser Builder build optimizer', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const overrides = { aot: true, buildOptimizer: true };
    const { files } = await browserBuild(architect, host, targetSpec, overrides);
    expect(await files['main.js']).not.toMatch(/\.decorators =/);
  });

  it('fails if AOT is disabled', async () => {
    const overrides = { aot: false, buildOptimizer: true };
    const run = await architect.scheduleTarget(targetSpec, overrides);
    await expectAsync(run.result).toBeRejectedWithError();
    await run.stop();
  });

  it('reduces bundle size', async () => {
    const noBoOverrides = { aot: true, optimization: true, vendorChunk: false };
    const boOverrides = { ...noBoOverrides, buildOptimizer: true };

    const run = await architect.scheduleTarget(targetSpec, noBoOverrides);
    const output = (await run.result) as BrowserBuilderOutput;

    expect(output.success).toBe(true);

    const noBoStats = await lastValueFrom(
      host.stat(join(normalize(output.outputs[0].path), 'main.js')),
    );
    if (!noBoStats) {
      throw new Error('Main file has no stats');
    }
    const noBoSize = noBoStats.size;
    await run.stop();

    const boRun = await architect.scheduleTarget(targetSpec, boOverrides);
    const boOutput = (await run.result) as BrowserBuilderOutput;
    expect(boOutput.success).toBe(true);

    const boStats = await lastValueFrom(
      host.stat(join(normalize(output.outputs[0].path), 'main.js')),
    );
    if (!boStats) {
      throw new Error('Main file has no stats');
    }
    const boSize = boStats.size;
    await boRun.stop();

    const sizeDiff = Math.round(((boSize - noBoSize) / noBoSize) * 10000) / 100;
    if (sizeDiff > -1 && sizeDiff < 0) {
      throw new Error(
        'Total size difference is too small, ' +
          'build optimizer does not seem to have made any optimizations.',
      );
    }

    if (sizeDiff > 1) {
      throw new Error(
        'Total size difference is positive, ' + 'build optimizer made the bundle bigger.',
      );
    }
  });
});
