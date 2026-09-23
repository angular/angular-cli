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
  describe('Option: "polyfills"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should include polyfills specified on test target', async () => {
      await harness.writeFiles({
        'src/custom-polyfill.js': `globalThis['CUSTOM_POLYFILL_RAN'] = true;`,
        'src/app/app.component.spec.ts': `
        import { describe, expect, test } from 'vitest';
        describe('Polyfill Test', () => {
          test('should have run test polyfill', () => {
            expect((globalThis as any)['CUSTOM_POLYFILL_RAN']).toBe(true);
          });
        });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        polyfills: ['src/custom-polyfill.js'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should override buildTarget polyfills when polyfills is specified on test target', async () => {
      setupApplicationTarget(harness, {
        polyfills: ['src/app-polyfill.js'],
      });

      await harness.writeFiles({
        'src/app-polyfill.js': `globalThis['APP_POLYFILL_RAN'] = true;`,
        'src/test-polyfill.js': `globalThis['TEST_POLYFILL_RAN'] = true;`,
        'src/app/app.component.spec.ts': `
        import { describe, expect, test } from 'vitest';
        describe('Polyfill Override Test', () => {
          test('should have run test polyfill and not app polyfill', () => {
            expect((globalThis as any)['TEST_POLYFILL_RAN']).toBe(true);
            expect((globalThis as any)['APP_POLYFILL_RAN']).toBeUndefined();
          });
        });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        polyfills: ['src/test-polyfill.js'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should allow overriding buildTarget polyfills with an empty array', async () => {
      setupApplicationTarget(harness, {
        polyfills: ['src/app-polyfill.js'],
      });

      await harness.writeFiles({
        'src/app-polyfill.js': `globalThis['APP_POLYFILL_RAN'] = true;`,
        'src/app/app.component.spec.ts': `
        import { describe, expect, test } from 'vitest';
        describe('Empty Polyfill Override Test', () => {
          test('should not have run app polyfill', () => {
            expect((globalThis as any)['APP_POLYFILL_RAN']).toBeUndefined();
          });
        });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        polyfills: [],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
