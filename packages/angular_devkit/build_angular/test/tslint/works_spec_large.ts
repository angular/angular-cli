/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect, Target } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { TestingArchitectHost } from '@angular-devkit/architect/testing';
import {
  logging,
  normalize,
  schema,
  workspaces,
} from '@angular-devkit/core';
import { NodeJsAsyncHost } from '@angular-devkit/core/node';
import * as path from 'path';

const devkitRoot = (global as any)._DevKitRoot; // tslint:disable-line:no-any
const workspaceRoot = path.join(devkitRoot, 'tests/angular_devkit/build_angular/hello-world-app/');

const lintTarget: Target = { project: 'app', target: 'lint' };

// tslint:disable-next-line:no-big-function
describe('Tslint Target', () => {
  // const filesWithErrors = { 'src/foo.ts': 'const foo = "";\n' };
  let testArchitectHost: TestingArchitectHost;
  let architect: Architect;

  beforeEach(async () => {
    const registry = new schema.CoreSchemaRegistry();
    registry.addPostTransform(schema.transforms.addUndefinedDefaults);

    const { workspace } = await workspaces.readWorkspace(
      normalize(workspaceRoot),
      workspaces.createWorkspaceHost(new NodeJsAsyncHost()),
    );

    testArchitectHost = new TestingArchitectHost(
      workspaceRoot,
      workspaceRoot,
      new WorkspaceNodeModulesArchitectHost(workspace, workspaceRoot),
    );
    architect = new Architect(testArchitectHost, registry);
  });

  it('works', async () => {
    const run = await architect.scheduleTarget({ project: 'app', target: 'lint' });
    const output = await run.result;
    expect(output.success).toBe(true);
    await run.stop();
  }, 30000);

  it(`should show project name as status and in the logs`, async () => {
    // Check logs.
    const logger = new logging.Logger('lint-info');
    const allLogs: string[] = [];
    logger.subscribe(entry => allLogs.push(entry.message));

    const run = await architect.scheduleTarget(lintTarget, {}, { logger });

    // Check status updates.
    const allStatus: string[] = [];
    run.progress.subscribe(progress => {
      if (progress.status !== undefined) {
        allStatus.push(progress.status);
      }
    });

    const output = await run.result;
    expect(output.success).toBe(true);
    expect(allStatus).toContain(jasmine.stringMatching(/linting.*"app".*/i));
    expect(allLogs).toContain(jasmine.stringMatching(/linting.*"app".*/i));
    await run.stop();
  });

  it(`should not show project name when formatter is non human readable`, async () => {
    const overrides = {
      format: 'checkstyle',
    };

    // Check logs.
    const logger = new logging.Logger('lint-info');
    const allLogs: string[] = [];
    logger.subscribe(entry => allLogs.push(entry.message));

    const run = await architect.scheduleTarget(lintTarget, overrides, { logger });

    // Check status updates.
    const allStatus: string[] = [];
    run.progress.subscribe(progress => {
      if (progress.status !== undefined) {
        allStatus.push(progress.status);
      }
    });

    const output = await run.result;
    expect(output.success).toBe(true);
    expect(allLogs).toContain(jasmine.stringMatching(/file name=.*app.module.ts/i));
    expect(allStatus).toContain(jasmine.stringMatching(/linting.*"app".*/i));
    expect(allLogs).not.toContain(jasmine.stringMatching(/linting.*"app".*/i));
    await run.stop();
  }, 30000);

  // it('should report lint error once', (done) => {
  //   host.writeMultipleFiles({'src/app/app.component.ts': 'const foo = "";\n' });
  //   const logger = new TestLogger('lint-error');
  //
  //   runTargetSpec(host, tslintTargetSpec, undefined, DefaultTimeout, logger).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(false)),
  //     tap(() => {
  //       // this is to make sure there are no duplicates
  //       expect(logger.includes(`" should be \'\nERROR`)).toBe(false);
  //
  //       expect(logger.includes(`" should be '`)).toBe(true);
  //       expect(logger.includes(`Lint errors found in the listed files`)).toBe(true);
  //     }),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('supports exclude with glob', (done) => {
  //   host.writeMultipleFiles(filesWithErrors);
  //   const overrides: Partial<TslintBuilderOptions> = { exclude: ['**/foo.ts'] };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(true)),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('supports exclude with relative paths', (done) => {
  //   host.writeMultipleFiles(filesWithErrors);
  //   const overrides: Partial<TslintBuilderOptions> = { exclude: ['src/foo.ts'] };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(true)),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it(`supports exclude with paths starting with './'`, (done) => {
  //   host.writeMultipleFiles(filesWithErrors);
  //   const overrides: Partial<TslintBuilderOptions> = { exclude: ['./src/foo.ts'] };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(true)),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('supports fix', (done) => {
  //   host.writeMultipleFiles(filesWithErrors);
  //   const overrides: Partial<TslintBuilderOptions> = { fix: true };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(true)),
  //     tap(() => {
  //       const fileName = normalize('src/foo.ts');
  //       const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
  //       expect(content).toContain(`const foo = '';`);
  //     }),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('supports force', (done) => {
  //   host.writeMultipleFiles(filesWithErrors);
  //   const logger = new TestLogger('lint-force');
  //   const overrides: Partial<TslintBuilderOptions> = { force: true };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides, DefaultTimeout, logger).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(true)),
  //     tap(() => {
  //       expect(logger.includes(`" should be '`)).toBe(true);
  //       expect(logger.includes(`Lint errors found in the listed files`)).toBe(true);
  //     }),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('supports format', (done) => {
  //   host.writeMultipleFiles(filesWithErrors);
  //   const logger = new TestLogger('lint-format');
  //   const overrides: Partial<TslintBuilderOptions> = { format: 'stylish' };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides, DefaultTimeout, logger).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(false)),
  //     tap(() => {
  //       expect(logger.includes(`quotemark`)).toBe(true);
  //     }),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('supports finding configs', (done) => {
  //   host.writeMultipleFiles({
  //     'src/app/foo/foo.ts': `const foo = '';\n`,
  //     'src/app/foo/tslint.json': `
  //       {
  //         "rules": {
  //           "quotemark": [
  //             true,
  //             "double"
  //           ]
  //         }
  //       }
  //     `,
  //   });
  //   const overrides: Partial<TslintBuilderOptions> = { tslintConfig: undefined };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(false)),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('supports overriding configs', (done) => {
  //   host.writeMultipleFiles({
  //     'src/app/foo/foo.ts': `const foo = '';\n`,
  //     'src/app/foo/tslint.json': `
  //       {
  //         "rules": {
  //           "quotemark": [
  //             true,
  //             "double"
  //           ]
  //         }
  //       }
  //     `,
  //   });
  //   const overrides: Partial<TslintBuilderOptions> = { tslintConfig: 'tslint.json' };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(true)),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('supports using files with no project', (done) => {
  //   const overrides: Partial<TslintBuilderOptions> = {
  //     tsConfig: undefined,
  //     files: ['src/app/**/*.ts'],
  //   };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(true)),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('supports using one project as a string', (done) => {
  //   const overrides: Partial<TslintBuilderOptions> = {
  //     tsConfig: 'src/tsconfig.app.json',
  //   };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(true)),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('supports using one project as an array', (done) => {
  //   const overrides: Partial<TslintBuilderOptions> = {
  //     tsConfig: ['src/tsconfig.app.json'],
  //   };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(true)),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('supports using two projects', (done) => {
  //   const overrides: Partial<TslintBuilderOptions> = {
  //     tsConfig: ['src/tsconfig.app.json', 'src/tsconfig.spec.json'],
  //   };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides).pipe(
  //     tap((buildEvent) => expect(buildEvent.success).toBe(true)),
  //   ).toPromise().then(done, done.fail);
  // }, 30000);
  //
  // it('errors when type checking is used without a project', (done) => {
  //   const overrides: Partial<TslintBuilderOptions> = {
  //     tsConfig: undefined,
  //     typeCheck: true,
  //   };
  //
  //   runTargetSpec(host, tslintTargetSpec, overrides)
  //     .subscribe(undefined, () => done(), done.fail);
  // }, 30000);
});
