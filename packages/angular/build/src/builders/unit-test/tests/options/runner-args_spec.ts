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
  UNIT_TEST_BUILDER_INFO,
  describeBuilder,
  expectLog,
  setupApplicationTarget,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "runnerArgs"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should fail when used with the karma runner', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runner: 'karma' as any,
        runnerArgs: ['--update'],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
      expectLog(logs, /The "runnerArgs" option is only available for the "vitest" runner/);
    });

    it('should fail when an unsupported Vitest option is provided', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runnerArgs: ['--reporter=dot'],
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
      expectLog(
        logs,
        /The Vitest "--reporter" option is not supported\. Use the "reporters" option instead\./,
      );
    });

    describe('with a test that passes on the second attempt', () => {
      beforeEach(async () => {
        await harness.writeFile(
          'src/app/retry.spec.ts',
          `
            let attempts = 0;

            it('passes on the second attempt', () => {
              attempts++;
              expect(attempts).toBe(2);
            });
          `,
        );
      });

      it('should fail when the test is not retried', async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeFalse();
      });

      it('should provide a supported Vitest option to the test project', async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerArgs: ['--retry=1'],
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
      });

      it('should take precedence over a Vitest configuration file', async () => {
        await harness.writeFile(
          'vitest-base.config.mts',
          `
            import { defineConfig } from 'vitest/config';

            export default defineConfig({
              test: {
                retry: 0,
              },
            });
          `,
        );

        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerConfig: true,
          runnerArgs: ['--retry=1'],
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
      });
    });

    describe('with an outdated snapshot', () => {
      const snapshotFile = 'src/app/__snapshots__/snapshot.spec.ts.snap';

      beforeEach(async () => {
        await harness.writeFile(
          'src/app/snapshot.spec.ts',
          `
            import { expect, it } from 'vitest';

            it('matches the snapshot', () => {
              expect('current value').toMatchSnapshot();
            });
          `,
        );

        await harness.writeFile(
          snapshotFile,
          '// Vitest Snapshot v1, https://vitest.dev/guide/snapshot.html\n\n' +
            'exports[`matches the snapshot 1`] = `"outdated value"`;\n',
        );
      });

      it('should fail when the snapshot is not updated', async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeFalse();
        harness.expectFile(snapshotFile).content.toContain('"outdated value"');
      });

      it('should update the snapshot when the Vitest update option is provided', async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runnerArgs: ['--update'],
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
        harness.expectFile(snapshotFile).content.toContain('"current value"');
        harness.expectFile(snapshotFile).content.not.toContain('"outdated value"');
      });
    });
  });
});
