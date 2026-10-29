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
  describe('Behavior: no test files', () => {
    beforeEach(() => {
      setupApplicationTarget(harness);
    });

    it('should fail when no tests are discovered and passWithNoTests is not enabled', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['**/__no_matching_tests__.spec.ts'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeFalse();
    });

    it('should succeed when no tests are discovered and passWithNoTests is enabled in runnerConfig', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['**/__no_matching_tests__.spec.ts'],
        runnerConfig: 'vitest.config.mts',
      });

      harness.writeFile(
        'vitest.config.mts',
        `
        import { defineConfig } from 'vitest/config';
        export default defineConfig({
          test: {
            passWithNoTests: true,
          },
        });
      `,
      );

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
    });
  });
});
