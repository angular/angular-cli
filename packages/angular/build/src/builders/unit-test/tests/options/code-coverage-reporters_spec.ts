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
  describe('Option: "codeCoverageReporters"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should generate a json summary report when specified', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
        codeCoverageReporters: ['json-summary'] as any,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(harness.hasFile('coverage/test/coverage-summary.json')).toBeTrue();
    });

    it('should generate multiple reports when specified', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
        codeCoverageReporters: ['json-summary', 'lcov'] as any,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(harness.hasFile('coverage/test/coverage-summary.json')).toBeTrue();
      expect(harness.hasFile('coverage/test/lcov.info')).toBeTrue();
    });
  });
});
