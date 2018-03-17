/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { TslintBuilderOptions } from '../../src';
import {
  TestLogger,
  TestProjectHost,
  runTargetSpec,
  tslintWorkspaceTarget,
  workspaceRoot,
} from '../utils';


describe('Tslint Target', () => {
  const host = new TestProjectHost(workspaceRoot);
  const filesWithErrors = { 'src/foo.ts': 'const foo = "";\n' };

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    runTargetSpec(host, tslintWorkspaceTarget).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports exclude', (done) => {
    host.writeMultipleFiles(filesWithErrors);
    const overrides: Partial<TslintBuilderOptions> = { exclude: ['**/foo.ts'] };

    runTargetSpec(host, tslintWorkspaceTarget, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports fix', (done) => {
    host.writeMultipleFiles(filesWithErrors);
    const overrides: Partial<TslintBuilderOptions> = { fix: true };

    runTargetSpec(host, tslintWorkspaceTarget, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = normalize('src/foo.ts');
        const content = virtualFs.fileBufferToString(host.asSync().read(fileName));
        expect(content).toContain(`const foo = '';`);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports force', (done) => {
    host.writeMultipleFiles(filesWithErrors);
    const logger = new TestLogger('lint-force');
    const overrides: Partial<TslintBuilderOptions> = { force: true };

    runTargetSpec(host, tslintWorkspaceTarget, overrides, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(logger.includes(`" should be '`)).toBe(true);
        expect(logger.includes(`Lint errors found in the listed files`)).toBe(true);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports format', (done) => {
    host.writeMultipleFiles(filesWithErrors);
    const logger = new TestLogger('lint-format');
    const overrides: Partial<TslintBuilderOptions> = { format: 'stylish' };

    runTargetSpec(host, tslintWorkspaceTarget, overrides, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
      tap(() => {
        expect(logger.includes(`quotemark`)).toBe(true);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports finding configs', (done) => {
    host.writeMultipleFiles({
      'src/app/foo/foo.ts': `const foo = '';\n`,
      'src/app/foo/tslint.json': `
        {
          "rules": {
            "quotemark": [
              true,
              "double"
            ]
          }
        }
      `,
    });
    const overrides: Partial<TslintBuilderOptions> = { tslintConfig: undefined };

    runTargetSpec(host, tslintWorkspaceTarget, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports overriding configs', (done) => {
    host.writeMultipleFiles({
      'src/app/foo/foo.ts': `const foo = '';\n`,
      'src/app/foo/tslint.json': `
        {
          "rules": {
            "quotemark": [
              true,
              "double"
            ]
          }
        }
      `,
    });
    const overrides: Partial<TslintBuilderOptions> = { tslintConfig: 'tslint.json' };

    runTargetSpec(host, tslintWorkspaceTarget, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports using files with no project', (done) => {
    const overrides: Partial<TslintBuilderOptions> = {
      tsConfig: undefined,
      files: ['src/app/**/*.ts'],
    };

    runTargetSpec(host, tslintWorkspaceTarget, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('errors when type checking is used without a project', (done) => {
    const overrides: Partial<TslintBuilderOptions> = {
      tsConfig: undefined,
      typeCheck: true,
    };

    runTargetSpec(host, tslintWorkspaceTarget, overrides).pipe(
    ).subscribe(undefined, done, done.fail);
  }, 30000);
});
