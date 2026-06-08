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
  describe('Option: "runnerConfig" Coverage Merging', () => {
    beforeEach(() => {
      setupApplicationTarget(harness);
    });

    describe('Vitest Runner', () => {
      it('should preserve thresholds from Vitest config when not overridden by CLI', async () => {
        harness.writeFile(
          'vitest-base.config.ts',
          `
          import { defineConfig } from 'vitest/config';
          export default defineConfig({
            test: {
              coverage: {
                thresholds: {
                  branches: 100
                }
              }
            }
          });
        `,
        );

        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerConfig: true,
          coverage: true,
        });

        const { result } = await harness.executeOnce();

        // Should fail because branches are not 100%
        expect(result?.success).toBeFalse();
      });

      it('should override Vitest config thresholds with CLI thresholds', async () => {
        harness.writeFile(
          'vitest-base.config.ts',
          `
          import { defineConfig } from 'vitest/config';
          export default defineConfig({
            test: {
              coverage: {
                thresholds: {
                  branches: 100
                }
              }
            }
          });
        `,
        );

        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerConfig: true,
          coverage: true,
          coverageThresholds: {
            branches: 0,
          },
        });

        const { result } = await harness.executeOnce();

        // Should pass because CLI overrides threshold to 0
        expect(result?.success).toBeTrue();
      });

      it('should merge partial CLI thresholds with Vitest config thresholds', async () => {
        harness.writeFile(
          'vitest-base.config.ts',
          `
          import { defineConfig } from 'vitest/config';
          export default defineConfig({
            test: {
              coverage: {
                thresholds: {
                  statements: 100,
                  branches: 100
                }
              }
            }
          });
        `,
        );

        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerConfig: true,
          coverage: true,
          coverageThresholds: {
            statements: 0,
            // branches is undefined here, should remain 100 from config
          },
        });

        const { result } = await harness.executeOnce();

        // Should still fail because branches threshold (100) is not met
        expect(result?.success).toBeFalse();
      });
    });
  });
});
