/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { BrowserBuilderOutput } from '@angular-devkit/build-angular';
import { logging } from '@angular-devkit/core';
import { debounceTime, take, tap } from 'rxjs/operators';
import { createArchitect, host } from '../../test-utils';

describe('Browser Builder unused files warnings', () => {
  const warningMessageSuffix = `is part of the TypeScript compilation but it's unused`;
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();

    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('should not show warning when all files are used', async () => {
    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    expect(logs.join().includes(warningMessageSuffix)).toBe(false);

    await run.stop();
  });

  it('should show warning when some files are unused', async () => {
    host.replaceInFile(
      'src/tsconfig.app.json',
      '"main.ts"',
      '"main.ts", "environments/environment.prod.ts"',
    );

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    expect(logs.join().includes(`environment.prod.ts ${warningMessageSuffix}`)).toBe(true);

    await run.stop();
  });

  it('should not show warning when excluded files are unused', async () => {
    const ignoredFiles = {
      'src/file.d.ts': 'export type MyType = number;',
    };

    host.writeMultipleFiles(ignoredFiles);

    host.replaceInFile(
      'src/tsconfig.app.json',
      '"main.ts"',
      `"main.ts", ${Object.keys(ignoredFiles)
        .map((f) => `"${f.replace('src/', '')}"`)
        .join(',')}`,
    );

    host.replaceInFile(
      'src/tsconfig.app.json',
      '"compilerOptions":',
      '"angularCompilerOptions": { "strictTemplates": true }, "compilerOptions":',
    );

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, { aot: true }, { logger });
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    expect(logs.join().includes(warningMessageSuffix)).toBe(false);

    await run.stop();
  });

  it('should not show warning when type files are used', async () => {
    host.writeMultipleFiles({
      'src/app/type.ts': 'export type MyType = number;',
    });

    host.replaceInFile(
      'src/app/app.component.ts',
      `'@angular/core';`,
      `'@angular/core';\nimport { MyType } from './type';\n`,
    );

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    expect(logs.join().includes(warningMessageSuffix)).toBe(false);

    await run.stop();
  });

  it('should not show warning when type files are used transitively', async () => {
    host.writeMultipleFiles({
      'src/app/type.ts': `import {Myinterface} from './interface'; export type MyType = Myinterface;`,
      'src/app/interface.ts': 'export interface Myinterface {nbr: number;}',
    });

    host.replaceInFile(
      'src/app/app.component.ts',
      `'@angular/core';`,
      `'@angular/core';\nimport { MyType } from './type';\n`,
    );

    const logger = new logging.Logger('');
    const logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    expect(logs.join().includes(warningMessageSuffix)).toBe(false);

    await run.stop();
  });

  it('works for rebuilds', async () => {
    host.replaceInFile('src/tsconfig.app.json', '"**/*.d.ts"', '"**/*.d.ts", "testing/**/*.ts"');

    const logger = new logging.Logger('');
    let logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));

    let buildNumber = 0;
    const run = await architect.scheduleTarget(targetSpec, { watch: true }, { logger });

    await run.output
      .pipe(
        debounceTime(1000),
        tap((buildEvent) => {
          expect(buildEvent.success).toBe(true);

          buildNumber++;
          switch (buildNumber) {
            case 1:
              // The first should not have unused files
              expect(logs.join().includes(warningMessageSuffix)).toBe(
                false,
                `Case ${buildNumber} failed.`,
              );

              // Write a used file
              host.writeMultipleFiles({
                'src/testing/type.ts': 'export type MyType = number;',
              });

              // touch file to trigger build
              host.replaceInFile(
                'src/app/app.component.ts',
                `'@angular/core';`,
                `'@angular/core';\n`,
              );
              break;

            case 2:
              // The second should have type.ts as unused
              expect(logs.join().includes(`type.ts ${warningMessageSuffix}`)).toBe(
                true,
                `Case ${buildNumber} failed.`,
              );

              host.replaceInFile(
                'src/app/app.component.ts',
                `'@angular/core';`,
                `'@angular/core';\nimport { MyType } from '../testing/type';`,
              );
              break;

            case 3:
              // The third should not have any unused files
              expect(logs.join().includes(warningMessageSuffix)).toBe(
                false,
                `Case ${buildNumber} failed.`,
              );
              break;
          }

          logs = [];
        }),
        take(3),
      )
      .toPromise();
    await run.stop();
  });

  it('should only show warning once per file', async () => {
    host.replaceInFile('src/tsconfig.app.json', '"**/*.d.ts"', '"**/*.d.ts", "testing/**/*.ts"');

    // Write a used file
    host.writeMultipleFiles({
      'src/testing/type.ts': 'export type MyType = number;',
    });

    const logger = new logging.Logger('');
    let logs: string[] = [];
    logger.subscribe((e) => logs.push(e.message));
    let buildNumber = 0;
    const run = await architect.scheduleTarget(targetSpec, { watch: true }, { logger });

    await run.output
      .pipe(
        debounceTime(1000),
        tap((buildEvent) => {
          expect(buildEvent.success).toBe(true);

          buildNumber++;
          switch (buildNumber) {
            case 1:
              // The first should have type.ts as unused.
              expect(logs.join().includes(`type.ts ${warningMessageSuffix}`)).toBe(
                true,
                `Case ${buildNumber} failed.`,
              );

              // touch a file to trigger a rebuild
              host.appendToFile('src/main.ts', '');
              break;
            case 2:
              // The second should should have type.ts as unused but shouldn't warn.
              expect(logs.join().includes(warningMessageSuffix)).toBe(
                false,
                `Case ${buildNumber} failed.`,
              );
              break;
          }

          logs = [];
        }),
        take(2),
      )
      .toPromise();
    await run.stop();
  });
});
