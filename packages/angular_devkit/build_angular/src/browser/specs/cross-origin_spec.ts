/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { BrowserBuilderOutput, CrossOrigin } from '@angular-devkit/build-angular';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { createArchitect, host } from '../../test-utils';

describe('Browser Builder crossOrigin', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    host.writeMultipleFiles({
      'src/index.html': Buffer.from(
        '\ufeff<html><head><base href="/"></head><body><app-root></app-root></body></html>',
        'utf8',
      ),
    });
  });

  afterEach(async () => host.restore().toPromise());

  it('works with use-credentials', async () => {
    const overrides = { crossOrigin: CrossOrigin.UseCredentials };
    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputPath), 'index.html');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toBe(
      `<html><head><base href="/"><link rel="stylesheet" href="styles.css" crossorigin="use-credentials"></head>` +
        `<body><app-root></app-root>` +
        `<script src="runtime.js" crossorigin="use-credentials" defer></script>` +
        `<script src="polyfills.js" crossorigin="use-credentials" defer></script>` +
        `<script src="vendor.js" crossorigin="use-credentials" defer></script>` +
        `<script src="main.js" crossorigin="use-credentials" defer></script></body></html>`,
    );
    await run.stop();
  });

  it('works with anonymous', async () => {
    const overrides = { crossOrigin: CrossOrigin.Anonymous };
    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputPath), 'index.html');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toBe(
        `<html><head><base href="/">` +
        `<link rel="stylesheet" href="styles.css" crossorigin="anonymous"></head>` +
        `<body><app-root></app-root>` +
        `<script src="runtime.js" crossorigin="anonymous" defer></script>` +
        `<script src="polyfills.js" crossorigin="anonymous" defer></script>` +
        `<script src="vendor.js" crossorigin="anonymous" defer></script>` +
        `<script src="main.js" crossorigin="anonymous" defer></script></body></html>`,
    );
    await run.stop();
  });

  it('works with none', async () => {
    const overrides = { crossOrigin: CrossOrigin.None };
    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputPath), 'index.html');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toBe(
        `<html><head><base href="/">` +
        `<link rel="stylesheet" href="styles.css"></head>` +
        `<body><app-root></app-root>` +
        `<script src="runtime.js" defer></script>` +
        `<script src="polyfills.js" defer></script>` +
        `<script src="vendor.js" defer></script>` +
        `<script src="main.js" defer></script></body></html>`,
    );
    await run.stop();
  });

  it('works for lazy chunks', async () => {
    host.writeMultipleFiles({
      'src/lazy-module.ts': 'export const value = 100;',
      'src/main.ts': `import('./lazy-module');`,
    });

    const overrides = { crossOrigin: CrossOrigin.UseCredentials };
    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);

    const fileName = join(normalize(output.outputPath), 'runtime.js');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toContain('script.crossOrigin = "use-credentials"');
  });
});
