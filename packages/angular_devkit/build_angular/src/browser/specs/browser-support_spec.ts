/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { logging } from '@angular-devkit/core';
import { createArchitect, host } from '../../test-utils';

describe('Browser Builder browser support', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    // target ES5 to disable differential loading which is not needed for the tests
    host.replaceInFile('tsconfig.json', '"target": "es2017"', '"target": "es5"');
  });
  afterEach(async () => host.restore().toPromise());

  it('warns when IE9 is present in browserslist', async () => {
    host.appendToFile('.browserslistrc', '\nIE 9');

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);

    const fullLog = logs.join();
    expect(fullLog).toContain(
      "Warning: Support was requested for IE 9 in the project's browserslist configuration.",
    );
    expect(fullLog).toContain('This browser is ');

    await run.stop();
  });

  it('warns when IE10 is present in browserslist', async () => {
    host.appendToFile('.browserslistrc', '\nIE 10');

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);

    const fullLog = logs.join();
    expect(fullLog).toContain(
      "Warning: Support was requested for IE 10 in the project's browserslist configuration.",
    );
    expect(fullLog).toContain('This browser is ');

    await run.stop();
  });

  it('warns when both IE9 & IE10 are present in browserslist', async () => {
    host.appendToFile('.browserslistrc', '\nIE 9-10');

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);

    const fullLog = logs.join();
    expect(fullLog).toContain(
      "Warning: Support was requested for IE 9 & IE 10 in the project's browserslist configuration.",
    );
    expect(fullLog).toContain('These browsers are ');

    await run.stop();
  });
});
