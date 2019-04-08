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
    const output = await run.result as BrowserBuilderOutput;

    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputPath), 'index.html');
    const content = virtualFs.fileBufferToString(await host.read(fileName).toPromise());
    expect(content).toMatch(/<base href="\/myUrl">/);

    await run.stop();
  });

  it('should insert base href in the the correct position', async () => {
    host.writeMultipleFiles({
      'src/index.html': tags.oneLine`
        <html><head><meta charset="UTF-8"></head>
        <body><app-root></app-root></body></html>
      `,
    });

    const overrides = { baseHref: '/myUrl' };
    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputPath), 'index.html');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    expect(content).toContain('<head><base href="/myUrl"><meta charset="UTF-8"></head>');
    await run.stop();
  });
});
