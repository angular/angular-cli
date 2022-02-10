/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { last, tap } from 'rxjs/operators';
import { promisify } from 'util';
import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeBuilder } from '../setup';

// In each of the test below we'll have to call setTimeout to wait for the coverage
// analysis to be done. This is because karma-coverage performs the analysis
// asynchronously but the promise that it returns is not awaited by Karma.
// Coverage analysis begins when onRunComplete() is invoked, and output files
// are subsequently written to disk. For more information, see
// https://github.com/karma-runner/karma-coverage/blob/32acafa90ed621abd1df730edb44ae55a4009c2c/lib/reporter.js#L221

const setTimeoutPromise = promisify(setTimeout);
const coveragePath = 'coverage/lcov.info';

describeBuilder(execute, KARMA_BUILDER_INFO, (harness) => {
  describe('Behavior: "codeCoverage"', () => {
    it('should generate coverage report when file was previously processed by Babel', async () => {
      // Force Babel transformation.
      await harness.appendToFile('src/app/app.component.ts', '// async');

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      await setTimeoutPromise(1000);
      harness.expectFile(coveragePath).toExist();
    });

    it('should exit with non-zero code when coverage is below threshold', async () => {
      await harness.modifyFile('karma.conf.js', (content) =>
        content.replace(
          'coverageReporter: {',
          `coverageReporter: {
             check: {
               global: {
                 statements: 100,
                 lines: 100,
                 branches: 100,
                 functions: 100
               }
             },
            `,
        ),
      );

      await harness.appendToFile(
        'src/app/app.component.ts',
        `
           export function nonCovered(): boolean {
             return true;
           }
         `,
      );

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
      });

      await harness
        .execute()
        .pipe(
          // In incremental mode, karma-coverage does not have the ability to mark a
          // run as failed if code coverage does not pass. This is because it does
          // the coverage asynchoronously and Karma does not await the promise
          // returned by the plugin.

          // However the program must exit with non-zero exit code.
          // This is a more common use case of coverage testing and must be supported.
          last(),
          tap((buildEvent) => expect(buildEvent.result?.success).toBeFalse()),
        )
        .toPromise();
    });

    it('should remapped instrumented code back to the original source', async () => {
      await harness.modifyFile('karma.conf.js', (content) => content.replace('lcov', 'html'));

      await harness.modifyFile('src/app/app.component.ts', (content) => {
        return content.replace(
          `title = 'app'`,
          tags.stripIndents`
          title = 'app';
  
          async foo() {
            return 'foo';
          }
        `,
        );
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      await setTimeoutPromise(1000);

      harness
        .expectFile('coverage/app.component.ts.html')
        .content.toContain(
          '<span class="fstat-no" title="function not covered" >async </span>foo()',
        );
    });
  });
});
