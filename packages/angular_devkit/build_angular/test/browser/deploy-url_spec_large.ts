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


describe('Browser Builder deploy url', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('uses deploy url for bundles urls and runtime', async () => {
    const overrides = { deployUrl: 'deployUrl/' };
    const overrides2 = { deployUrl: 'http://example.com/some/path/' };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.outputPath).not.toBeUndefined();
    const outputPath = normalize(output.outputPath);

    const fileName = join(outputPath, 'index.html');
    const runtimeFileName = join(outputPath, 'runtime.js');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toContain('deployUrl/main.js');
    const runtimeContent = virtualFs.fileBufferToString(
      await host.read(normalize(runtimeFileName)).toPromise(),
    );
    expect(runtimeContent).toContain('deployUrl/');

    const run2 = await architect.scheduleTarget(targetSpec, overrides2);
    const output2 = await run2.result as BrowserBuilderOutput;
    expect(output2.outputPath).toEqual(outputPath);  // These should be the same.

    const content2 = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content2).toContain('http://example.com/some/path/main.js');

    await run.stop();
    await run2.stop();
  });
});
