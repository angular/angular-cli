/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { ServerBuilderOutput } from '../../src';
import { createArchitect, host } from '../utils';


describe('Server Builder external dependencies', () => {
  const target = { project: 'app', target: 'server' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  const outputPath = normalize('dist-server');

  it('should not bundle an given external dependency', async () => {
    const overrides = {
      bundleDependencies: true,
      externalDependencies: [
        '@angular/core',
      ],
    };

    const run = await architect.scheduleTarget(target, overrides);
    const output = await run.result as ServerBuilderOutput;
    expect(output.success).toBe(true);

    const fileName = join(outputPath, 'main.js');
    const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
    expect(content).toContain('require("@angular/core")');
    expect(content).not.toContain('require("@angular/common")');

    await run.stop();
  });
});
