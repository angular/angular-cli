/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies

import { Architect } from '@angular-devkit/architect';
import { normalize, virtualFs } from '@angular-devkit/core';
import { last, tap } from 'rxjs/operators';
import { promisify } from 'util';
import { createArchitect, host, karmaTargetSpec } from '../test-utils';

// In each of the test below we'll have to call setTimeout to wait for the coverage
// analysis to be done. This is because karma-coverage performs the analysis
// asynchronously but the promise that it returns is not awaited by Karma.
// Coverage analysis begins when onRunComplete() is invoked, and output files
// are subsequently written to disk. For more information, see
// https://github.com/karma-runner/karma-coverage/blob/32acafa90ed621abd1df730edb44ae55a4009c2c/lib/reporter.js#L221

const setTimeoutPromise = promisify(setTimeout);

describe('Karma Builder code coverage', () => {
  const coverageFilePath = normalize('coverage/lcov.info');
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(() => host.restore().toPromise());

  it('supports code coverage option', async () => {
    const run = await architect.scheduleTarget(karmaTargetSpec, { codeCoverage: true });

    const { success } = await run.result;
    expect(success).toBe(true);

    await run.stop();

    await setTimeoutPromise(1000);

    const exists = host.scopedSync().exists(coverageFilePath);
    expect(exists).toBe(true, `${coverageFilePath} does not exist`);

    if (exists) {
      const content = virtualFs.fileBufferToString(host.scopedSync().read(coverageFilePath));
      expect(content).toContain('app.component.ts');
      expect(content).toContain('test.ts');
    }
  });

  it('supports code coverage exclude option', async () => {
    const overrides = {
      codeCoverage: true,
      codeCoverageExclude: ['**/test.ts'],
    };

    const run = await architect.scheduleTarget(karmaTargetSpec, overrides);

    const { success } = await run.result;
    expect(success).toBe(true);

    await run.stop();

    await setTimeoutPromise(1000);

    const exists = host.scopedSync().exists(coverageFilePath);
    expect(exists).toBe(true);

    if (exists) {
      const content = virtualFs.fileBufferToString(host.scopedSync().read(coverageFilePath));
      expect(content).not.toContain('test.ts');
    }
  });

  it(`should collect coverage from paths in 'sourceRoot'`, async () => {
    const files: { [path: string]: string } = {
      './dist/my-lib/index.d.ts': `
        export declare const title = 'app';
      `,
      './dist/my-lib/index.js': `
        export const title = 'app';
      `,
      './src/app/app.component.ts': `
        import { Component } from '@angular/core';
        import { title } from 'my-lib';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {
          title = title;
        }
      `,
    };

    host.writeMultipleFiles(files);

    host.replaceInFile(
      'tsconfig.json',
      /"baseUrl": ".\/",/,
      `
      "baseUrl": "./",
      "paths": {
        "my-lib": [
          "./dist/my-lib"
        ]
      },
    `,
    );

    const run = await architect.scheduleTarget(karmaTargetSpec, { codeCoverage: true });

    const { success } = await run.result;
    expect(success).toBe(true);

    await run.stop();

    await setTimeoutPromise(1000);

    const exists = host.scopedSync().exists(coverageFilePath);
    expect(exists).toBe(true);

    if (exists) {
      const content = virtualFs.fileBufferToString(host.scopedSync().read(coverageFilePath));
      expect(content).not.toContain('my-lib');
    }
  });

  it('should exit with non-zero code when coverage is below threshold', async () => {
    host.replaceInFile(
      'karma.conf.js',
      'coverageReporter: {',
      `
      coverageReporter: {
        check: {
          global: {
            statements: 100,
            lines: 100,
            branches: 100,
            functions: 100
          }
        },
    `,
    );

    host.appendToFile(
      'src/app/app.component.ts',
      `
      export function nonCovered(): boolean {
        return true;
      }
    `,
    );

    const run = await architect.scheduleTarget(karmaTargetSpec, { codeCoverage: true });

    // In incremental mode, karma-coverage does not have the ability to mark a
    // run as failed if code coverage does not pass. This is because it does
    // the coverage asynchoronously and Karma does not await the promise
    // returned by the plugin.
    expect((await run.result).success).toBeTrue();

    // However the program must exit with non-zero exit code.
    // This is a more common use case of coverage testing and must be supported.
    await run.output
      .pipe(
        last(),
        tap((buildEvent) => expect(buildEvent.success).toBeFalse()),
      )
      .toPromise();

    await run.stop();
  });

  it('is able to process coverage plugin provided as string', async () => {
    host.replaceInFile(
      'karma.conf.js',
      /plugins: \[.+?\]/s,
      `plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('@angular-devkit/build-angular/plugins/karma'),
      'karma-coverage', // instead of require('karma-coverage')
    ]`,
    );
    const run = await architect.scheduleTarget(karmaTargetSpec, { codeCoverage: true });

    const { success } = await run.result;
    expect(success).toBe(true);
    await run.stop();
  });

  it('is able to process coverage plugins provided as string karma-*', async () => {
    host.replaceInFile(
      'karma.conf.js',
      /plugins: \[.+?\]/s,
      `plugins: [
      'karma-*',
      require('@angular-devkit/build-angular/plugins/karma'),
    ]`,
    );
    const run = await architect.scheduleTarget(karmaTargetSpec, { codeCoverage: true });

    const { success } = await run.result;
    expect(success).toBe(true);
    await run.stop();
  });
});
