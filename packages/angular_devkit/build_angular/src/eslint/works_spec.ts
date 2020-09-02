/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect, Target } from '@angular-devkit/architect';
import {
  logging,
  normalize,
  virtualFs,
} from '@angular-devkit/core';
import { createArchitect, host } from '../test-utils';

const lintTarget: Target = { project: 'app', target: 'eslint' };

describe('ESlint Target', () => {
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(() => host.restore().toPromise());

  it('works', async () => {
    const run = await architect.scheduleTarget(lintTarget);
    const output = await run.result;
    expect(output.success).toBe(true);
    await run.stop();
  });

  it('should show project name as status and in the logs', async () => {
    const logger = new logging.Logger('lint-works');
    const allLogs: string[] = [];
    logger.subscribe(entry => allLogs.push(entry.message));
    const run = await architect.scheduleTarget(lintTarget, {}, { logger });

    const output = await run.result;
    expect(output.success).toBe(true);
    expect(allLogs.join('\n')).not.toMatch(/linting.*"app".*/);
    await run.stop();
  });

  it(`should not show project name when formatter is non human readable`, async () => {
    const logger = new logging.Logger('lint-human-readable');
    const allLogs: string[] = [];
    logger.subscribe(entry => allLogs.push(entry.message));
    const run = await architect.scheduleTarget(lintTarget, { format: 'checkstyle' }, { logger });

    const output = await run.result;
    expect(output.success).toBe(true);
    expect(allLogs.join('\n')).toMatch(/file name=.*app\.module\.ts./);
    expect(allLogs.join('\n')).not.toMatch(/linting.*"app".*/);
    await run.stop();
  });

  it('supports fix', async () => {
    const filesWithErrors = { 'src/foo.ts': `var foo = '';` };
    host.writeMultipleFiles(filesWithErrors);
    const run1 = await architect.scheduleTarget(lintTarget, { fix: false });
    const output1 = await run1.result;
    expect(output1.success).toBe(false);

    const run2 = await architect.scheduleTarget(lintTarget, { fix: true });
    const output2 = await run2.result;
    expect(output2.success).toBe(true);
    const fileName = normalize('src/foo.ts');
    const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
    expect(content).toContain(`const foo = '';`);
  });
});
