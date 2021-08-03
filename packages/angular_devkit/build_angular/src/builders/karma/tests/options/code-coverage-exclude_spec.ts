/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

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
  describe('Option: "codeCoverageExclude"', () => {
    it('should exclude file from coverage when set', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
        codeCoverageExclude: ['**/app.component.ts'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();

      await setTimeoutPromise(1000);
      harness.expectFile(coveragePath).content.not.toContain('app.component.ts');
    });

    it('should not exclude file from coverage when set', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();

      await setTimeoutPromise(1000);
      harness.expectFile(coveragePath).content.toContain('app.component.ts');
    });
  });
});
