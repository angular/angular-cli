/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { logging } from '@angular-devkit/core';
import { createArchitect, host } from '../../../testing/test-utils';

describe('Browser Builder browser support', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('warns when IE is present in browserslist', async () => {
    host.appendToFile('.browserslistrc', '\nIE 9');

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);

    expect(logs.join()).toContain(
      "Warning: Support was requested for Internet Explorer in the project's browserslist configuration",
    );
    await run.stop();
  });
});
