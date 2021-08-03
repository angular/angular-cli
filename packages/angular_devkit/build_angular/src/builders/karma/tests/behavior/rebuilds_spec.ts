/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { concatMap, count, debounceTime, take, timeout } from 'rxjs/operators';
import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(execute, KARMA_BUILDER_INFO, (harness) => {
  describe('Behavior: "Rebuilds"', () => {
    it('recovers from compilation failures in watch mode', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const goodFile = await harness.readFile('src/app/app.component.spec.ts');

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(60000),
          debounceTime(500),
          concatMap(async ({ result }, index) => {
            switch (index) {
              case 0:
                // Karma run should succeed.
                // Add a compilation error.
                expect(result?.success).toBeTrue();
                // Add an syntax error to a non-main file.
                await harness.appendToFile('src/app/app.component.spec.ts', `error`);
                break;

              case 1:
                expect(result?.success).toBeFalse();
                await harness.writeFile('src/app/app.component.spec.ts', goodFile);
                break;

              case 2:
                expect(result?.success).toBeTrue();
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
