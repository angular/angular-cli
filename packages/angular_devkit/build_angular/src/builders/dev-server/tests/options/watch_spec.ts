/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { TimeoutError } from 'rxjs';
import { concatMap, count, take, timeout } from 'rxjs/operators';
import { serveWebpackBrowser } from '../../index';
import {
  BASE_OPTIONS,
  BUILD_TIMEOUT,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('Option: "watch"', () => {
    beforeEach(() => {
      setupBrowserTarget(harness);
    });

    it('does not wait for file changes when false', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: false,
      });

      await harness
        .execute()
        .pipe(
          timeout(BUILD_TIMEOUT * 2),
          concatMap(async ({ result }, index) => {
            expect(result?.success).toBe(true);

            switch (index) {
              case 0:
                await harness.modifyFile(
                  'src/main.ts',
                  (content) => content + 'console.log("abcd1234");',
                );
                break;
              case 1:
                fail('Expected files to not be watched.');
                break;
            }
          }),
          take(2),
        )
        .toPromise()
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
      });

      const buildCount = await harness
        .execute()
        .pipe(
          timeout(BUILD_TIMEOUT * 2),
          concatMap(async ({ result }, index) => {
            expect(result?.success).toBe(true);

            switch (index) {
              case 0:
                await harness.modifyFile(
                  'src/main.ts',
                  (content) => content + 'console.log("abcd1234");',
                );
                break;
              case 1:
                break;
            }
          }),
          take(2),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(2);
    });

    it('watches for file changes when true', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const buildCount = await harness
        .execute()
        .pipe(
          timeout(BUILD_TIMEOUT * 2),
          concatMap(async ({ result }, index) => {
            expect(result?.success).toBe(true);

            switch (index) {
              case 0:
                await harness.modifyFile(
                  'src/main.ts',
                  (content) => content + 'console.log("abcd1234");',
                );
                break;
              case 1:
                break;
            }
          }),
          take(2),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(2);
    });
  });
});
