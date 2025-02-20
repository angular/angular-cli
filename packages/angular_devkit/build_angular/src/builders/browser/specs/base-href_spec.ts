/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize, tags, virtualFs } from '@angular-devkit/core';
import { lastValueFrom } from 'rxjs';
import { createArchitect, host } from '../../../testing/test-utils';
import { BrowserBuilderOutput } from '../index';

describe('Browser Builder base href', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    host.writeMultipleFiles({
      'src/my-js-file.js': `console.log(1); export const a = 2;`,
      'src/main.ts': `import { a } from './my-js-file'; console.log(a);`,
    });

    const overrides = { baseHref: '/myUrl' };
    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;

    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputs[0].path), 'index.html');
    const content = virtualFs.fileBufferToString(await lastValueFrom(host.read(fileName)));
    expect(content).toMatch(/<base href="\/myUrl">/);

    await run.stop();
  });

  it('should not override base href in HTML when option is not set', async () => {
    host.writeMultipleFiles({
      'src/index.html': `
      <html>
        <head><base href="."></head>
        <body></body>
      </html>
      `,
    });

    const run = await architect.scheduleTarget(targetSpec);
    const output = (await run.result) as BrowserBuilderOutput;

    expect(output.success).toBeTrue();
    const fileName = join(normalize(output.outputs[0].path), 'index.html');
    const content = virtualFs.fileBufferToString(await lastValueFrom(host.read(fileName)));
    expect(content).toContain(`<base href=".">`);

    await run.stop();
  });

  it('should insert base href in the correct position', async () => {
    host.writeMultipleFiles({
      'src/index.html': tags.oneLine`
        <html><head><meta charset="UTF-8"></head>
        <body><app-root></app-root></body></html>
      `,
    });

    const overrides = { baseHref: '/myUrl' };
    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputs[0].path), 'index.html');
    const content = virtualFs.fileBufferToString(
      await lastValueFrom(host.read(normalize(fileName))),
    );
    expect(content).toContain('<head><base href="/myUrl"><meta charset="UTF-8">');
    await run.stop();
  });
});
