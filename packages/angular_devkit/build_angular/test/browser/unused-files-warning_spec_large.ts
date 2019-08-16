/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { TestLogger } from '@angular-devkit/architect/testing';
import { debounceTime, take, tap } from 'rxjs/operators';
import { BrowserBuilderOutput } from '../../src/browser/index';
import { createArchitect, host, veEnabled } from '../utils';

// tslint:disable-next-line:no-big-function
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
    if (veEnabled) {
      // TODO: https://github.com/angular/angular-cli/issues/15056
      pending('Only supported in Ivy.');

      return;
    }

    const logger = new TestLogger('unused-files-warnings');
    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    expect(logger.includes(warningMessageSuffix)).toBe(false);
    logger.clear();

    await run.stop();
  });

  it('should show warning when some files are unused', async () => {
    if (veEnabled) {
      // TODO: https://github.com/angular/angular-cli/issues/15056
      pending('Only supported in Ivy.');

      return;
    }

    host.replaceInFile(
      'src/tsconfig.app.json',
      '"main.ts"',
      '"main.ts", "environments/environment.prod.ts"',
    );

    const logger = new TestLogger('unused-files-warnings');
    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    expect(logger.includes(`environment.prod.ts ${warningMessageSuffix}`)).toBe(true);
    logger.clear();

    await run.stop();
  });

  it('should not show warning when type files are used', async () => {
    if (veEnabled) {
      // TODO: https://github.com/angular/angular-cli/issues/15056
      pending('Only supported in Ivy.');

      return;
    }

    host.writeMultipleFiles({
      'src/app/type.ts': 'export type MyType = number;',
    });

    host.replaceInFile(
      'src/app/app.component.ts',
      `'@angular/core';`,
      `'@angular/core';\nimport { MyType } from './type';\n`,
    );

    const logger = new TestLogger('unused-files-warnings');
    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = await run.result as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    expect(logger.includes(warningMessageSuffix)).toBe(false);
    logger.clear();

    await run.stop();
  });

  it('works for rebuilds', async () => {
    if (veEnabled) {
      // TODO: https://github.com/angular/angular-cli/issues/15056
      pending('Only supported in Ivy.');

      return;
    }

    host.replaceInFile(
      'src/tsconfig.app.json',
      '"**/*.d.ts"',
      '"**/*.d.ts", "testing/**/*.ts"',
    );

    const logger = new TestLogger('unused-files-warnings');
    let buildNumber = 0;
    const run = await architect.scheduleTarget(targetSpec, { watch: true }, { logger });

    await run.output
      .pipe(
        debounceTime(1000),
        tap(buildEvent => {
          expect(buildEvent.success).toBe(true);

          buildNumber ++;
          switch (buildNumber) {
            case 1:
              // The first should not have unused files
              expect(logger.includes(warningMessageSuffix)).toBe(false, `Case ${buildNumber} failed.`);

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
              expect(logger.includes(`type.ts ${warningMessageSuffix}`)).toBe(true, `Case ${buildNumber} failed.`);

              host.replaceInFile(
                'src/app/app.component.ts',
                `'@angular/core';`,
                `'@angular/core';\nimport { MyType } from '../testing/type';`,
              );
              break;

            case 3:
              // The third should not have any unused files
              expect(logger.includes(warningMessageSuffix)).toBe(false, `Case ${buildNumber} failed.`);
              break;
          }

          logger.clear();
        }),
        take(3),
      )
      .toPromise();
    await run.stop();
  });

  it('should only show warning once per file', async () => {
    if (veEnabled) {
      // TODO: https://github.com/angular/angular-cli/issues/15056
      pending('Only supported in Ivy.');

      return;
    }

    host.replaceInFile(
      'src/tsconfig.app.json',
      '"**/*.d.ts"',
      '"**/*.d.ts", "testing/**/*.ts"',
    );

    // Write a used file
    host.writeMultipleFiles({
      'src/testing/type.ts': 'export type MyType = number;',
    });

    const logger = new TestLogger('unused-files-warnings');
    let buildNumber = 0;
    const run = await architect.scheduleTarget(targetSpec, { watch: true }, { logger });

    await run.output
      .pipe(
        debounceTime(1000),
        tap(buildEvent => {
          expect(buildEvent.success).toBe(true);

          buildNumber ++;
          switch (buildNumber) {
            case 1:
              // The first should have type.ts as unused.
              expect(logger.includes(`type.ts ${warningMessageSuffix}`)).toBe(true, `Case ${buildNumber} failed.`);

              // touch a file to trigger a rebuild
              host.appendToFile('src/main.ts', '');
              break;
            case 2:
              // The second should should have type.ts as unused but shouldn't warn.
              expect(logger.includes(warningMessageSuffix)).toBe(false, `Case ${buildNumber} failed.`);
              break;
          }

          logger.clear();
        }),
        take(2),
      )
      .toPromise();
    await run.stop();
  });

});
