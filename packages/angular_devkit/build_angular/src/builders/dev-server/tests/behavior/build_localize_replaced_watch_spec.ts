/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/* eslint-disable max-len */
import { concatMap, count, take, timeout } from 'rxjs';
import { URL } from 'url';
import { executeDevServer } from '../../index';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, BUILD_TIMEOUT, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(
  executeDevServer,
  DEV_SERVER_BUILDER_INFO,
  (harness, setupTarget, isViteRun) => {
    // TODO(fix-vite): currently this is broken in vite.
    (isViteRun ? xdescribe : describe)(
      'Behavior: "i18n $localize calls are replaced during watching"',
      () => {
        beforeEach(() => {
          harness.useProject('test', {
            root: '.',
            sourceRoot: 'src',
            cli: {
              cache: {
                enabled: false,
              },
            },
            i18n: {
              sourceLocale: {
                'code': 'fr',
              },
            },
          });

          setupTarget(harness, { localize: ['fr'] });
        });

        it('$localize are replaced in watch', async () => {
          harness.useTarget('serve', {
            ...BASE_OPTIONS,
            watch: true,
          });

          await harness.writeFile(
            'src/app/app.component.html',
            `
          <p id="hello" i18n="An introduction header for this sample">Hello {{ title }}! </p>
        `,
          );

          const buildCount = await harness
            .execute()
            .pipe(
              timeout(BUILD_TIMEOUT * 2),
              concatMap(async ({ result }, index) => {
                expect(result?.success).toBe(true);

                const response = await fetch(new URL('main.js', `${result?.baseUrl}`));
                expect(await response?.text()).not.toContain('$localize`:');

                switch (index) {
                  case 0: {
                    await harness.modifyFile('src/app/app.component.html', (content) =>
                      content.replace('introduction', 'intro'),
                    );
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
      },
    );
  },
);
