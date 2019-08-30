/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, logging, normalize, virtualFs } from '@angular-devkit/core';
import { BrowserBuilderOutput } from '../../src/browser';
import { createArchitect, host, veEnabled } from '../utils';

describe('Browser Builder AOT', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const overrides = { aot: true };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;

    expect(output.success).toBe(true);

    const fileName = join(normalize(output.outputPath), 'main.js');
    const content = virtualFs.fileBufferToString(await host.read(normalize(fileName)).toPromise());
    if (!veEnabled) {
      expect(content).toContain('AppComponent.ngComponentDef');
    } else {
      expect(content).toMatch(/platformBrowser.*bootstrapModuleFactory.*AppModuleNgFactory/);
    }

    await run.stop();
  });

  it('shows warnings for component styles', async () => {
    const overrides = {
      aot: true,
      optimization: true,
    };

    host.writeMultipleFiles({
      'src/app/app.component.css': `
        .foo { color: white; padding: 1px; };
        .buz { color: white; padding: 2px; };
      `,
    });

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, overrides, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);
    expect(logs.join()).toContain('WARNING in Invalid selector');
    await run.stop();
  });

  it('shows error when component stylesheet contains SCSS syntax error', async () => {
    const overrides = {
      aot: true,
    };

    host.replaceInFile(
      'src/app/app.component.ts',
      'app.component.css',
      'app.component.scss',
    );

    host.writeMultipleFiles({
      'src/app/app.component.scss': `
        .foo {
      `,
    });

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, overrides, { logger });
    const output = await run.result;
    expect(output.success).toBe(false);
    expect(logs.join()).toContain('SassError: expected "}".');
    await run.stop();
  });
});
