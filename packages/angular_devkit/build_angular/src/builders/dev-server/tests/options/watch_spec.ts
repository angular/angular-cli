/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { TimeoutError } from 'rxjs';
import { executeDevServer } from '../../index';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('Option: "watch"', () => {
    beforeEach(() => {
      setupTarget(harness);
    });

    it('does not wait for file changes when false', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: false,
      });

      await harness
        .executeWithCases(
          [
            async ({ result }) => {
              expect(result?.success).toBeTrue();

              await harness.modifyFile(
                'src/main.ts',
                (content) => content + 'console.log("abcd1234");',
              );
            },
            () => {
              fail('Expected files to not be watched.');
            },
          ],
          { timeout: 25_000 },
        )
        .catch((error) => {
          // Timeout is expected if watching is disabled
          if (error instanceof TimeoutError) {
            return;
          }

          throw error;
        });
    });

    it('watches for file changes when not present', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: undefined,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBe(true);

          await harness.modifyFile(
            'src/main.ts',
            (content) => content + 'console.log("abcd1234");',
          );
        },
        ({ result }) => {
          expect(result?.success).toBe(true);
        },
      ]);
    });

    it('watches for file changes when true', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBe(true);

          await harness.modifyFile(
            'src/main.ts',
            (content) => content + 'console.log("abcd1234");',
          );
        },
        ({ result }) => {
          expect(result?.success).toBe(true);
        },
      ]);
    });
  });
});
