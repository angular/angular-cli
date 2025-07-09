/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { timeout } from 'rxjs';
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "watch"', () => {
    beforeEach(async () => {
      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
    });

    it('does not wait for file changes when false', (done) => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: false,
      });

      // If the build waits then it will timeout with the custom timeout.
      // A single build should not take more than 15 seconds.
      let count = 0;
      harness
        .execute()
        .pipe(timeout(15000))
        .subscribe({
          complete() {
            expect(count).toBe(1);
            done();
          },
          next({ result }) {
            count++;
            expect(result?.success).toBe(true);
          },
          error(error) {
            done.fail(error);
          },
        });
    });

    it('does not wait for file changes when not present', (done) => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      // If the build waits then it will timeout with the custom timeout.
      // A single build should not take more than 15 seconds.
      let count = 0;
      harness
        .execute()
        .pipe(timeout(15000))
        .subscribe({
          complete() {
            expect(count).toBe(1);
            done();
          },
          next({ result }) {
            count++;
            expect(result?.success).toBe(true);
          },
          error(error) {
            done.fail(error);
          },
        });
    });

    it('watches for file changes when true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        main: 'src/main.ts',
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBe(true);
          harness.expectFile('dist/main.js').content.not.toContain('abcd1234');

          await harness.modifyFile(
            'src/main.ts',
            (content) => content + 'console.log("abcd1234");',
          );
        },
        ({ result }) => {
          expect(result?.success).toBe(true);
          harness.expectFile('dist/main.js').content.toContain('abcd1234');
        },
      ]);
    });
  });
});
