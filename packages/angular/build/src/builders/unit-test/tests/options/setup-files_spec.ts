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
  xdescribe('Option: "setupFiles"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should fail when a setup file does not exist', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        setupFiles: ['src/setup.ts'],
      });

      const { result, error } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result).toBeUndefined();
      expect(error?.message).toMatch(`The specified setup file "src/setup.ts" does not exist.`);
    });

    it('should include the setup files', async () => {
      await harness.writeFiles({
        'src/setup.ts': `console.log('Hello from setup.ts');`,
        'src/app/app.component.spec.ts': `
        import { describe, expect, test } from 'vitest'
        describe('AppComponent', () => {
          test('should create the app', () => {
            expect(true).toBe(true);
          });
        });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        setupFiles: ['src/setup.ts'],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expectLog(logs, 'Hello from setup.ts');
    });
  });
});
