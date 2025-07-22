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
  xdescribe('Option: "codeCoverageExclude"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
      await harness.writeFiles({
        'src/app/error.ts': `export const a = 1;`,
      });
    });

    it('should not exclude any files from coverage when not provided', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      const summary = harness.readFile('coverage/coverage-summary.json');
      expect(summary).toContain('"src/app/error.ts"');
    });

    it('should exclude files from coverage that match the glob pattern', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
        codeCoverageExclude: ['**/error.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      const summary = harness.readFile('coverage/coverage-summary.json');
      expect(summary).not.toContain('"src/app/error.ts"');
    });
  });
});
