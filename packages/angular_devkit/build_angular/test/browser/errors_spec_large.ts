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


describe('Browser Builder errors', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('shows error when files are not part of the compilation', async () => {
    host.replaceInFile('src/tsconfig.app.json', '"compilerOptions": {', `
      "files": ["main.ts"],
      "compilerOptions": {
    `);
    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, {}, { logger });
    const output = await run.result;
    expect(output.success).toBe(false);
    expect(logs.join()).toContain('polyfills.ts is missing from the TypeScript');
    await run.stop();
  });

  it('shows TS syntax errors', async () => {
    host.appendToFile('src/app/app.component.ts', ']]]');
    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, {}, { logger });
    const output = await run.result;
    expect(output.success).toBe(false);
    expect(logs.join()).toContain('Declaration or statement expected');
    await run.stop();
  });

  it('shows static analysis errors', async () => {
    host.replaceInFile('src/app/app.component.ts', `'app-root'`, `(() => 'app-root')()`);
    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, { aot: true }, { logger });
    const output = await run.result;
    expect(output.success).toBe(false);
    expect(logs.join()).toContain('Function expressions are not supported in');
    await run.stop();
  });
});
