/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { concatMap, count, take, timeout } from 'rxjs';
import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

/**
 * Maximum time in milliseconds for single build/rebuild
 * This accounts for CI variability.
 */
export const BUILD_TIMEOUT = 30_000;

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Rebuilds when input index HTML changes"', () => {
    beforeEach(async () => {
      // Application code is not needed for styles tests
      await harness.writeFile('src/main.ts', 'console.log("TEST");');
    });

    it('rebuilds output index HTML', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(30000),
          concatMap(async ({ result }, index) => {
            switch (index) {
              case 0:
                expect(result?.success).toBe(true);
                harness.expectFile('dist/browser/index.html').content.toContain('charset="utf-8"');

                await harness.modifyFile('src/index.html', (content) =>
                  content.replace('charset="utf-8"', 'abc'),
                );
                break;
              case 1:
                expect(result?.success).toBe(true);
                harness
                  .expectFile('dist/browser/index.html')
                  .content.not.toContain('charset="utf-8"');

                await harness.modifyFile('src/index.html', (content) =>
                  content.replace('abc', 'charset="utf-8"'),
                );
                break;
              case 2:
                expect(result?.success).toBe(true);
                harness.expectFile('dist/browser/index.html').content.toContain('charset="utf-8"');

                break;
            }
          }),
          take(3),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(3);
    });
  });
});
