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

const VITEST_CONFIG_CONTENT = `
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    reporters: [['junit', { outputFile: './vitest-results.xml' }]],
  },
});
`;

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "runnerConfig"', () => {
    beforeEach(() => {
      setupApplicationTarget(harness);
    });

    describe('Vitest Runner', () => {
      it('should use a specified config file path', async () => {
        harness.writeFile('custom-vitest.config.ts', VITEST_CONFIG_CONTENT);
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerConfig: 'custom-vitest.config.ts',
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('vitest-results.xml').toExist();
      });

      it('should search for a config file when `true`', async () => {
        harness.writeFile('vitest-base.config.ts', VITEST_CONFIG_CONTENT);
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerConfig: true,
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('vitest-results.xml').toExist();
      });

      it('should ignore config file when `false`', async () => {
        harness.writeFile('vitest-base.config.ts', VITEST_CONFIG_CONTENT);
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerConfig: false,
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('vitest-results.xml').toNotExist();
      });

      it('should ignore config file by default', async () => {
        harness.writeFile('vitest-base.config.ts', VITEST_CONFIG_CONTENT);
        harness.useTarget('test', {
          ...BASE_OPTIONS,
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('vitest-results.xml').toNotExist();
      });

      it('should find and use a `vitest-base.config.mts` in the project root', async () => {
        harness.writeFile('vitest-base.config.mts', VITEST_CONFIG_CONTENT);
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerConfig: true,
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('vitest-results.xml').toExist();
      });

      it('should find and use a `vitest-base.config.js` in the workspace root', async () => {
        // This file should be ignored because the new logic looks for `vitest-base.config.*`.
        harness.writeFile('vitest.config.ts', VITEST_CONFIG_CONTENT);
        // The workspace root is the directory containing the project root in the test harness.
        harness.writeFile('vitest-base.config.js', VITEST_CONFIG_CONTENT);
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerConfig: true,
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('vitest-results.xml').toExist();
      });

      it('should fallback to in-memory config when no base config is found', async () => {
        // This file should be ignored because the new logic looks for `vitest-base.config.*`
        // and when `runnerConfig` is true, it should not fall back to the default search.
        harness.writeFile('vitest.config.ts', VITEST_CONFIG_CONTENT);
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerConfig: true,
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
        harness.expectFile('vitest-results.xml').toNotExist();
      });
    });
  });
});
