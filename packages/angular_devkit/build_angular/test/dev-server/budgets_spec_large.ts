/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize, virtualFs } from '@angular-devkit/core';
import { createArchitect, host } from '../utils';

describe('Dev Server Builder bundle budgets', () => {
  const targetSpec = { project: 'app', target: 'serve' };

  beforeEach(async () => host.initialize().toPromise());
  afterEach(async () => host.restore().toPromise());

  it('should ignore budgets', async () => {
    const config = host.scopedSync().read(normalize('angular.json'));
    const jsonConfig = JSON.parse(virtualFs.fileBufferToString(config));
    const buildOptions = jsonConfig.projects.app.targets.build.options;

    buildOptions.budgets = [{ type: 'all', maximumError: '100b' }],
    buildOptions.optimization = true;

    host.writeMultipleFiles({
      'angular.json': JSON.stringify(jsonConfig),
    });

    const architect = (await createArchitect(host.root())).architect;
    const run = await architect.scheduleTarget(targetSpec);
    const output = await run.result;
    expect(output.success).toBe(true);
    await run.stop();
  });
});
