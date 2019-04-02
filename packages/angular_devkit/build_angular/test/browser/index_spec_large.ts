/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize, tags, virtualFs } from '@angular-devkit/core';
import { BrowserBuilderOutput } from '../../src/browser';
import { createArchitect, host } from '../utils';


describe('Browser Builder works with BOM index.html', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works with UTF-8 BOM', async () => {
    host.writeMultipleFiles({
      'src/index.html': Buffer.from(
        '\ufeff<html><head><base href="/"></head><body><app-root></app-root></body></html>',
        'utf8'),
    });

    const run = await architect.scheduleTarget(targetSpec);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputPath), 'index.html');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toBe(
      `<html><head><base href="/"></head>`
      + `<body><app-root></app-root><script src="runtime.js"></script>`
      + `<script src="polyfills.js"></script><script src="styles.js"></script>`
      + `<script src="vendor.js"></script><script src="main.js"></script></body></html>`,
    );
    await run.stop();
  });

  it('works with UTF16 LE BOM', async () => {
    host.writeMultipleFiles({
      'src/index.html': Buffer.from(
        '\ufeff<html><head><base href="/"></head><body><app-root></app-root></body></html>',
        'utf16le'),
    });

    const run = await architect.scheduleTarget(targetSpec);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputPath), 'index.html');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toBe(
      `<html><head><base href="/"></head><body><app-root></app-root>`
      + `<script src="runtime.js"></script><script src="polyfills.js"></script>`
      + `<script src="styles.js"></script><script src="vendor.js"></script>`
      + `<script src="main.js"></script></body></html>`,
    );
    await run.stop();
  });

  it('keeps escaped charaters', async () => {
    host.writeMultipleFiles({
      'src/index.html': tags.oneLine`
        <html><head><title>&iacute;</title><base href="/"></head>
        <body><app-root></app-root></body></html>
      `,
    });

    const run = await architect.scheduleTarget(targetSpec);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputPath), 'index.html');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toBe(
      `<html><head><title>&iacute;</title><base href="/"></head> `
      + `<body><app-root></app-root><script src="runtime.js"></script>`
      + `<script src="polyfills.js"></script><script src="styles.js"></script>`
      + `<script src="vendor.js"></script><script src="main.js"></script></body></html>`,
    );
    await run.stop();
  });

  it('keeps custom template charaters', async () => {
    host.writeMultipleFiles({
      'src/index.html': tags.oneLine`
        <html><head><base href="/"><%= csrf_meta_tags %></head>
        <body><app-root></app-root></body></html>
      `,
    });

    const run = await architect.scheduleTarget(targetSpec);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputPath), 'index.html');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toBe(
      `<html><head><base href="/"><%= csrf_meta_tags %></head> `
      + `<body><app-root></app-root><script src="runtime.js"></script>`
      + `<script src="polyfills.js"></script><script src="styles.js"></script>`
      + `<script src="vendor.js"></script><script src="main.js"></script></body></html>`,
    );
    await run.stop();
  });
});
