/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { concatMap, count, take, timeout } from 'rxjs/operators';
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "Rebuild Error"', () => {
    it('recovers from component stylesheet error', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(30000),
          concatMap(async ({ result, logs }, index) => {
            switch (index) {
              case 0:
                expect(result?.success).toBeTrue();
                await harness.writeFile('src/app/app.component.css', 'invalid-css-content');

                break;
              case 1:
                expect(result?.success).toBeFalse();
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching('invalid-css-content'),
                  }),
                );

                await harness.writeFile('src/app/app.component.css', 'p { color: green }');

                break;
              case 2:
                expect(result?.success).toBeTrue();
                expect(logs).not.toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching('invalid-css-content'),
                  }),
                );

                harness.expectFile('dist/main.js').content.toContain('p { color: green }');

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
