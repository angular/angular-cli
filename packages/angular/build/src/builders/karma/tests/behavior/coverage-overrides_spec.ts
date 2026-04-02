/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { last, tap } from 'rxjs';
import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';

/**
 * Regression test for https://github.com/angular/angular-cli/issues/30956
 *
 * Coverage `overrides` in karma.conf.js were ignored because karma-coverage
 * resolves the override patterns relative to the karma `basePath`, which is
 * the temporary build output directory. Patterns written relative to the
 * workspace root (e.g. `src/app/app.component.ts`) never matched.
 */
describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "coverageReporter.check overrides"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    it('should respect per-file overrides in coverageReporter.check.each.overrides', async () => {
      // Add a function that won't be covered – with a 100% global threshold this
      // would normally cause a failure. The override for app.component.ts drops
      // the threshold to 0 so the run should still succeed.
      await harness.appendToFile(
        'src/app/app.component.ts',
        `
export function notCovered(): boolean {
  return true;
}
        `,
      );

      await harness.modifyFile('karma.conf.js', (content) =>
        content.replace(
          'coverageReporter: {',
          `coverageReporter: {
            check: {
              global: {
                statements: 100,
                lines: 100,
                branches: 100,
                functions: 100,
              },
              each: {
                statements: 0,
                lines: 0,
                branches: 0,
                functions: 0,
                overrides: {
                  'src/app/app.component.ts': {
                    statements: 0,
                    lines: 0,
                    branches: 0,
                    functions: 0,
                  },
                },
              },
            },
          `,
        ),
      );

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
      });

      // If overrides are ignored the global 100% threshold will be applied to
      // app.component.ts and the run will fail. With the fix the per-file
      // override (0%) is used and the run succeeds.
      await harness
        .execute()
        .pipe(
          last(),
          tap((buildEvent) => expect(buildEvent.result?.success).toBeTrue()),
        )
        .toPromise();
    });
  });
});
