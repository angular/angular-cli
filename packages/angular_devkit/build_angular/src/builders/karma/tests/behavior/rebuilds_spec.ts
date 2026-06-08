/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "Rebuilds"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    it('recovers from compilation failures in watch mode', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const goodFile = await harness.readFile('src/app/app.component.spec.ts');

      await harness.executeWithCases(
        [
          async ({ result }) => {
            // Karma run should succeed.
            // Add a compilation error.
            expect(result?.success).withContext('Initial test run should succeed').toBeTrue();
            // Add an syntax error to a non-main file.
            await harness.appendToFile('src/app/app.component.spec.ts', `error`);
          },
          async ({ result }) => {
            expect(result?.success)
              .withContext('Test should fail after build error was introduced')
              .toBeFalse();
            await harness.writeFile('src/app/app.component.spec.ts', goodFile);
          },
          async ({ result }) => {
            expect(result?.success)
              .withContext('Test should succeed again after build error was fixed')
              .toBeTrue();
          },
        ],
        { outputLogsOnFailure: false },
      );
    });
  });
});
