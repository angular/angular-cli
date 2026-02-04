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
        'src/setup.ts': `globalThis['TEST_SETUP_RAN'] = true;`,
        'src/app/app.component.spec.ts': `
        import { describe, expect, test } from 'vitest'
        describe('AppComponent', () => {
          test('should have run setup file', () => {
            expect(globalThis['TEST_SETUP_RAN']).toBe(true);
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
  });
});
