/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { lastValueFrom } from 'rxjs';
import { createArchitect, host } from '../../../testing/test-utils';
import { BrowserBuilderOutput } from '../index';

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

    // Add lazy loaded chunk to provide a usage of the deploy URL
    // Webpack 5+ will not include the deploy URL in the code unless needed
    host.appendToFile('src/main.ts', '\nimport("./lazy");');
    host.writeMultipleFiles({
      'src/lazy.ts': 'export const foo = "bar";',
    });

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    expect(output.outputs[0].path).not.toBeUndefined();
    const outputPath = normalize(output.outputs[0].path);

    const fileName = join(outputPath, 'index.html');
    const runtimeFileName = join(outputPath, 'runtime.js');
    const content = virtualFs.fileBufferToString(
      await lastValueFrom(host.read(normalize(fileName))),
    );
    expect(content).toContain('deployUrl/main.js');
    const runtimeContent = virtualFs.fileBufferToString(
      await lastValueFrom(host.read(normalize(runtimeFileName))),
    );
    expect(runtimeContent).toContain('deployUrl/');

    const run2 = await architect.scheduleTarget(targetSpec, overrides2);
    const output2 = (await run2.result) as BrowserBuilderOutput;
    expect(output2.outputs[0].path).toEqual(outputPath); // These should be the same.

    const content2 = virtualFs.fileBufferToString(
      await lastValueFrom(host.read(normalize(fileName))),
    );
    expect(content2).toContain('http://example.com/some/path/main.js');

    await run.stop();
    await run2.stop();
  });
});
