/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { logging } from '@angular-devkit/core';
import { createArchitect, host } from '../test-utils';

describe('Dev Server Builder commonjs warning', () => {
  const targetSpec = { project: 'app', target: 'serve' };

  let architect: Architect;
  let logger: logging.Logger;
  let logs: string[];

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    // Create logger
    logger = new logging.Logger('');
    logs = [];
    logger.subscribe(e => logs.push(e.message));
  });

  afterEach(async () => host.restore().toPromise());

  it('should not show warning when using HMR', async () => {
    const run = await architect.scheduleTarget(targetSpec, { hmr: true }, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);
    expect(logs.join()).not.toContain('Warning');
    await run.stop();
  });

  it('should not show warning when using live-reload', async () => {
    const run = await architect.scheduleTarget(targetSpec, { liveReload: true}, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);
    expect(logs.join()).not.toContain('Warning');
    await run.stop();
  });
});
