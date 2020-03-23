/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { logging } from '@angular-devkit/core';
import { createArchitect, host } from '../utils';

describe('Browser Builder commonjs warning', () => {
  const targetSpec = { project: 'app', target: 'build' };

  let architect: Architect;
  let logger: logging.Logger;
  let logs: string[];

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    // Add a Common JS dependency
    host.appendToFile('src/app/app.component.ts', `import 'bootstrap';`);

    // Create logger
    logger = new logging.Logger('');
    logs = [];
    logger.subscribe(e => logs.push(e.message));
  });

  afterEach(async () => host.restore().toPromise());

  it('should show warning when depending on a Common JS bundle', async () => {
    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);
    const logMsg = logs.join();
    expect(logMsg).toMatch(/WARNING in.+app\.component\.ts depends on bootstrap\. CommonJS or AMD dependencies/);
    expect(logMsg).not.toContain('jquery', 'Should not warn on transitive CommonJS packages which parent is also CommonJS.');
    await run.stop();
  });

  it('should not show warning when depending on a Common JS bundle which is allowed', async () => {
    const overrides = {
      allowedCommonJsDependencies: [
        'bootstrap',
      ],
    };

    const run = await architect.scheduleTarget(targetSpec, overrides, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);
    expect(logs.join()).not.toContain('WARNING');
    await run.stop();
  });
});
