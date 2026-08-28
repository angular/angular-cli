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
  expectNoLog,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "splitting"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should default to true and run tests successfully', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should run tests successfully when splitting is true', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        splitting: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should run tests successfully when splitting is false', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        splitting: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should split shared code into a separate chunk when splitting is true', async () => {
      await harness.writeFile(
        'src/app/shared.ts',
        `export const SHARED_DATA = 'shared-data-value';`,
      );

      await harness.writeFile(
        'src/app/first.spec.ts',
        `
        import { SHARED_DATA } from './shared';

        it('tests first', () => {
          expect(SHARED_DATA).toBe('shared-data-value');
        });
        `,
      );

      await harness.writeFile(
        'src/app/second.spec.ts',
        `
        import { SHARED_DATA } from './shared';

        it('tests second', () => {
          expect(SHARED_DATA).toBe('shared-data-value');
        });
        `,
      );

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        splitting: true,
        quiet: false,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expectLog(logs, /chunk-[a-z0-9]+\.js/i);
    });

    it('should not split shared code into a separate chunk when splitting is false', async () => {
      await harness.writeFile(
        'src/app/shared.ts',
        `export const SHARED_DATA = 'shared-data-value';`,
      );

      await harness.writeFile(
        'src/app/first.spec.ts',
        `
        import { SHARED_DATA } from './shared';

        it('tests first', () => {
          expect(SHARED_DATA).toBe('shared-data-value');
        });
        `,
      );

      await harness.writeFile(
        'src/app/second.spec.ts',
        `
        import { SHARED_DATA } from './shared';

        it('tests second', () => {
          expect(SHARED_DATA).toBe('shared-data-value');
        });
        `,
      );

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        splitting: false,
        quiet: false,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expectNoLog(logs, /chunk-[a-z0-9]+\.js/i);
    });
  });
});
