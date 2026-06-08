/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import {
  BASE_OPTIONS,
  describeBuilder,
  UNIT_TEST_BUILDER_INFO,
  setupApplicationTarget,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "coverageInclude"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
      await harness.writeFiles({
        'src/app/included.ts': `export const a = 1;`,
        'src/app/included.spec.ts': `
          import { a } from './included';
          describe('included', () => {
            it('should work', () => {
              expect(a).toBe(1);
            });
          });
        `,
        'src/app/excluded.ts': `export const b = 2;`,
      });
    });

    it('should only include and report coverage for files that match the glob pattern', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        coverage: true,
        coverageInclude: ['**/included.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const summary = JSON.parse(harness.readFile('coverage/test/coverage-final.json'));
      const summaryKeys = Object.keys(summary);

      const includedKey = summaryKeys.find((key) => key.endsWith('src/app/included.ts'));
      const excludedKey = summaryKeys.find((key) => key.endsWith('src/app/excluded.ts'));

      // Check that the included file is in the report and the excluded one is not.
      expect(includedKey).toBeDefined();
      expect(excludedKey).toBeUndefined();

      // Check that the coverage data for the included file is valid.
      const includedCoverage = summary[includedKey!];
      // The file has one statement, and it should have been executed once.
      expect(includedCoverage.s['0']).toBe(1);
    });

    it('should only include referenced files when no include pattern is provided', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        coverage: true,
        // coverageInclude is not provided, so only referenced files should be included.
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      const summary = JSON.parse(harness.readFile('coverage/test/coverage-final.json'));
      const summaryKeys = Object.keys(summary);

      const includedKey = summaryKeys.find((key) => key.endsWith('src/app/included.ts'));
      const excludedKey = summaryKeys.find((key) => key.endsWith('src/app/excluded.ts'));

      // The included file is referenced by its spec and should be in the report.
      expect(includedKey).toBeDefined();
      // The excluded file is not referenced and should NOT be in the report.
      expect(excludedKey).toBeUndefined();
    });
  });
});
