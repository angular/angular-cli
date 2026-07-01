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
  describe('Option: "manualRebuild"', () => {
    beforeEach(() => {
      setupTarget(harness);
    });

    it('buffers file changes and does not rebuild until the trigger file is touched', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: true,
        manualRebuild: true,
      });

      await harness
        .executeWithCases([
          async ({ result }) => {
            // Initial build should succeed
            expect(result?.success).toBe(true);

            // Modifying a source file should be buffered, not rebuilt
            await harness.modifyFile(
              'src/main.ts',
              (content) => content + 'console.log("abcd1234");',
            );
          },
          () => {
            fail('Expected automatic rebuild to be paused until the trigger file is touched.');
          },
        ])
        .catch((error) => {
          // A timeout is expected because the rebuild is paused.
          if (error instanceof TimeoutError) {
            return;
          }
          throw error;
        });
    });

    it('does not rebuild when the trigger file is touched but no changes are queued', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: true,
        manualRebuild: true,
      });

      await harness
        .executeWithCases([
          async ({ result }) => {
            // Initial build should succeed
            expect(result?.success).toBe(true);

            // Touch the trigger file without modifying any source file.
            // With an empty queue there is nothing to rebuild.
            await harness.writeFile('.ng-rebuild', '');
          },
          () => {
            fail('Expected no rebuild when the trigger file is touched with an empty queue.');
          },
        ])
        .catch((error) => {
          // A timeout is expected because no rebuild should be emitted.
          if (error instanceof TimeoutError) {
            return;
          }
          throw error;
        });
    });

    it('flushes buffered (coalesced) changes as a single rebuild when the trigger file is touched', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: true,
        manualRebuild: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          // Initial build should succeed
          expect(result?.success).toBe(true);

          // Several edits to the same file should coalesce to a single net change...
          await harness.modifyFile('src/main.ts', (content) => content + 'console.log("first");');
          await harness.modifyFile('src/main.ts', (content) => content + 'console.log("second");');

          // ...and only flush once the trigger file is modified.
          await harness.writeFile('.ng-rebuild', '');
        },
        async ({ result }) => {
          // Touching the trigger file should produce a single successful rebuild.
          expect(result?.success).toBe(true);
        },
      ]);
    });

    it('supports a custom trigger file via "rebuildTrigger"', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: true,
        manualRebuild: true,
        rebuildTrigger: '.rebuild-now',
      });

      await harness.executeWithCases([
        async ({ result }) => {
          // Initial build should succeed
          expect(result?.success).toBe(true);

          await harness.modifyFile(
            'src/main.ts',
            (content) => content + 'console.log("abcd1234");',
          );

          // Touch the custom trigger file to flush the buffered change.
          await harness.writeFile('.rebuild-now', '');
        },
        async ({ result }) => {
          expect(result?.success).toBe(true);
        },
      ]);
    });
  });
});
