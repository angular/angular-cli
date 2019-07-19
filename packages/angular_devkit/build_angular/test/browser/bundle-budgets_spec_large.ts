/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { logging } from '@angular-devkit/core';
import { createArchitect, host } from '../utils';


describe('Browser Builder bundle budgets', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('accepts valid bundles', async () => {
    const overrides = {
      optimization: true,
      budgets: [{ type: 'allScript', maximumError: '100mb' }],
    };
    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, overrides, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);
    expect(logs.join()).not.toContain('WARNING');
    await run.stop();
  });

  it('shows errors', async () => {
    const overrides = {
      optimization: true,
      budgets: [{ type: 'all', maximumError: '100b' }],
    };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = await run.result;
    expect(output.success).toBe(false);
    await run.stop();
  });

  it('shows warnings', async () => {
    const overrides = {
      optimization: true,
      budgets: [{ type: 'all', minimumWarning: '100mb' }],
    };
    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, overrides, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);
    expect(logs.join()).toContain('WARNING');
    await run.stop();
  });

  it(`shows warnings for large component css when using 'anyComponentStyle' when AOT`, async () => {
    const overrides = {
      aot: true,
      optimization: true,
      budgets: [{ type: 'anyComponentStyle', maximumWarning: '1b' }],
    };

    const cssContent = `
      .foo { color: white; padding: 1px; }
      .buz { color: white; padding: 2px; }
      .bar { color: white; padding: 3px; }
    `;

    host.writeMultipleFiles({
      'src/app/app.component.css': cssContent,
      'src/assets/foo.css': cssContent,
      'src/styles.css': cssContent,
    });

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, overrides, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);
    expect(logs.length).toBe(2);
    expect(logs.join()).toMatch(/WARNING.+app\.component\.css/);
    await run.stop();
  });

  it(`shows error for large component css when using 'anyComponentStyle' when AOT`, async () => {
    const overrides = {
      aot: true,
      optimization: true,
      budgets: [{ type: 'anyComponentStyle', maximumError: '1b' }],
    };

    const cssContent = `
      .foo { color: white; padding: 1px; }
      .buz { color: white; padding: 2px; }
      .bar { color: white; padding: 3px; }
    `;

    host.writeMultipleFiles({
      'src/app/app.component.css': cssContent,
      'src/assets/foo.css': cssContent,
      'src/styles.css': cssContent,
    });

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, overrides, { logger });
    const output = await run.result;
    expect(output.success).toBe(false);
    expect(logs.length).toBe(2);
    expect(logs.join()).toMatch(/ERROR.+app\.component\.css/);
    await run.stop();
  });

  describe(`should ignore '.map' files`, () => {
    it(`when 'bundle' budget`, async () => {
      const overrides = {
        optimization: true,
        budgets: [{ type: 'bundle', name: 'main', maximumError: '3Kb' }],
      };

      const run = await architect.scheduleTarget(targetSpec, overrides);
      const output = await run.result;
      expect(output.success).toBe(true);
      await run.stop();
    });

    it(`when 'intial' budget`, async () => {
      const overrides = {
        optimization: true,
        budgets: [{ type: 'initial', maximumError: '1mb' }],
      };

      const run = await architect.scheduleTarget(targetSpec, overrides);
      const output = await run.result;
      expect(output.success).toBe(true);
      await run.stop();
    });

    it(`when 'all' budget`, async () => {
      const overrides = {
        optimization: true,
        budgets: [{ type: 'all', maximumError: '1mb' }],
      };

      const run = await architect.scheduleTarget(targetSpec, overrides);
      const output = await run.result;
      expect(output.success).toBe(true);
      await run.stop();
    });

    it(`when 'any' budget`, async () => {
      const overrides = {
        optimization: true,
        budgets: [{ type: 'any', maximumError: '1mb' }],
      };

      const run = await architect.scheduleTarget(targetSpec, overrides);
      const output = await run.result;
      expect(output.success).toBe(true);
      await run.stop();
    });
  });
});
