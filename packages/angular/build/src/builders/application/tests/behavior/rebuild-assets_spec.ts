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
const BUILD_TIMEOUT = 10_000;

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Rebuilds when input asset changes"', () => {
    beforeEach(async () => {
      // Application code is not needed for styles tests
      await harness.writeFile('src/main.ts', 'console.log("TEST");');
      await harness.writeFile('public/asset.txt', 'foo');
    });

    it('emits updated asset', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: '**/*',
            input: 'public',
          },
        ],
        watch: true,
      });

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(BUILD_TIMEOUT),
          concatMap(async ({ result }, index) => {
            switch (index) {
              case 0:
                expect(result?.success).toBeTrue();
                harness.expectFile('dist/browser/asset.txt').content.toContain('foo');

                await harness.writeFile('public/asset.txt', 'bar');
                break;
              case 1:
                expect(result?.success).toBeTrue();
                harness.expectFile('dist/browser/asset.txt').content.toContain('bar');
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
