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

/**
 * Maximum time in milliseconds for single build/rebuild
 * This accounts for CI variability.
 */
export const BUILD_TIMEOUT = 30_000;

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Rebuilds when component stylesheets change"', () => {
    for (const aot of [true, false]) {
      it(`updates component when imported sass changes with ${aot ? 'AOT' : 'JIT'}`, async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          watch: true,
          aot,
        });

        await harness.modifyFile('src/app/app.component.ts', (content) =>
          content.replace('app.component.css', 'app.component.scss'),
        );
        await harness.writeFile('src/app/app.component.scss', "@import './a';");
        await harness.writeFile('src/app/a.scss', '$primary: aqua;\\nh1 { color: $primary; }');

        const buildCount = await harness
          .execute()
          .pipe(
            timeout(30000),
            concatMap(async ({ result }, index) => {
              expect(result?.success).toBe(true);

              switch (index) {
                case 0:
                  harness.expectFile('dist/browser/main.js').content.toContain('color: aqua');
                  harness.expectFile('dist/browser/main.js').content.not.toContain('color: blue');

                  await harness.writeFile(
                    'src/app/a.scss',
                    '$primary: blue;\\nh1 { color: $primary; }',
                  );
                  break;
                case 1:
                  harness.expectFile('dist/browser/main.js').content.not.toContain('color: aqua');
                  harness.expectFile('dist/browser/main.js').content.toContain('color: blue');

                  await harness.writeFile(
                    'src/app/a.scss',
                    '$primary: green;\\nh1 { color: $primary; }',
                  );
                  break;
                case 2:
                  harness.expectFile('dist/browser/main.js').content.not.toContain('color: aqua');
                  harness.expectFile('dist/browser/main.js').content.not.toContain('color: blue');
                  harness.expectFile('dist/browser/main.js').content.toContain('color: green');

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
