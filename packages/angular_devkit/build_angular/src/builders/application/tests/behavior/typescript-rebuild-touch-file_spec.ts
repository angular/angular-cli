/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { concatMap, count, take, timeout } from 'rxjs';
import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Rebuilds when touching file"', () => {
    for (const aot of [true, false]) {
      it(`Rebuild correctly when file is touched with ${aot ? 'AOT' : 'JIT'}`, async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          watch: true,
          aot,
        });

        const buildCount = await harness
          .execute({ outputLogsOnFailure: false })
          .pipe(
            timeout(30_000),
            concatMap(async ({ result }, index) => {
              switch (index) {
                case 0:
                  expect(result?.success).toBeTrue();
                  // Touch a file without doing any changes.
                  await harness.modifyFile('src/app/app.component.ts', (content) => content);
                  break;
                case 1:
                  expect(result?.success).toBeTrue();
                  await harness.removeFile('src/app/app.component.ts');
                  break;
                case 2:
                  expect(result?.success).toBeFalse();
                  break;
              }
            }),
            take(3),
            count(),
          )
          .toPromise();

        expect(buildCount).toBe(3);
      });
    }
  });
});
