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
  expectLog,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "setupFiles"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should fail when a setup file does not exist', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        setupFiles: ['src/setup.ts'],
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();
      // Verify that the build failed due to resolution error (esbuild error)
      expectLog(logs, /Could not resolve/);
      expectLog(logs, /src\/setup\.ts/);
    });

    it('should include the setup files', async () => {
      await harness.writeFiles({
        'src/setup.ts': `(globalThis as any)['TEST_SETUP_RAN'] = true;`,
        'src/app/app.component.spec.ts': `
        import { describe, expect, test } from 'vitest'
        describe('AppComponent', () => {
          test('should have run setup file', () => {
            expect((globalThis as any)['TEST_SETUP_RAN']).toBe(true);
          });
        });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        setupFiles: ['src/setup.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should run setup file hooks for each spec file when coverage is enabled', async () => {
      await harness.writeFiles({
        'custom-vitest.config.mts': `
          import { defineConfig } from 'vitest/config';

          export default defineConfig({
            test: {
              fileParallelism: false,
            },
          });
        `,
        'src/setup.ts': `
          import { afterEach, beforeEach, expect } from 'vitest';
          const global = globalThis as typeof globalThis & {
            setupHookCalls?: string[];
          };
          const setupHookCalls = (global.setupHookCalls ??= []);
          beforeEach(() => {
            const testName = expect.getState().currentTestName ?? '';
            setupHookCalls.push('beforeEach:' + testName);
          });
          afterEach(() => {
            const testName = expect.getState().currentTestName ?? '';
            setupHookCalls.push('afterEach:' + testName);
          });
        `,
        'src/app/app.component.spec.ts': `
          import { expect, it } from 'vitest';
          it('runs setup hooks for first test in app.component.spec', () => {
            const global = globalThis as typeof globalThis & { setupHookCalls?: string[] };
            expect(global.setupHookCalls).toContain('beforeEach:runs setup hooks for first test in app.component.spec');
          });
          it('runs setup hooks for second test in app.component.spec', () => {
            const global = globalThis as typeof globalThis & { setupHookCalls?: string[] };
            expect(global.setupHookCalls).toContain('beforeEach:runs setup hooks for second test in app.component.spec');
            expect(global.setupHookCalls).toContain('afterEach:runs setup hooks for first test in app.component.spec');
          });
        `,
        'src/app/second.spec.ts': `
          import { expect, it } from 'vitest';
          it('runs setup hooks for first test in second.spec', () => {
            const global = globalThis as typeof globalThis & { setupHookCalls?: string[] };
            expect(global.setupHookCalls).toContain('beforeEach:runs setup hooks for first test in second.spec');
          });
          it('runs setup hooks for second test in second.spec', () => {
            const global = globalThis as typeof globalThis & { setupHookCalls?: string[] };
            expect(global.setupHookCalls).toContain('beforeEach:runs setup hooks for second test in second.spec');
            expect(global.setupHookCalls).toContain('afterEach:runs setup hooks for first test in second.spec');
          });
        `,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        coverage: true,
        runnerConfig: 'custom-vitest.config.mts',
        setupFiles: ['src/setup.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
