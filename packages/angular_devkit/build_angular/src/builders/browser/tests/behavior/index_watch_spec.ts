/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { concatMap, count, take, timeout } from 'rxjs/operators';
import { BUILD_TIMEOUT, buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "index is updated during watch mode"', () => {
    it('index is watched in watch mode', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const buildCount = await harness
        .execute()
        .pipe(
          timeout(BUILD_TIMEOUT),
          concatMap(async ({ result }, index) => {
            expect(result?.success).toBe(true);

            switch (index) {
              case 0: {
                harness.expectFile('dist/index.html').content.toContain('HelloWorldApp');
                harness.expectFile('dist/index.html').content.not.toContain('UpdatedPageTitle');

                // Trigger rebuild
                await harness.modifyFile('src/index.html', (s) =>
                  s.replace('HelloWorldApp', 'UpdatedPageTitle'),
                );
                break;
              }
              case 1: {
                harness.expectFile('dist/index.html').content.toContain('UpdatedPageTitle');
                break;
              }
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
