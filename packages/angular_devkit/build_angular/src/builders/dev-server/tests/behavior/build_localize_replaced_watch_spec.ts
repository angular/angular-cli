/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/* eslint-disable max-len */
import fetch from 'node-fetch'; // eslint-disable-line import/no-extraneous-dependencies
import { concatMap, count, take, timeout } from 'rxjs/operators';
import { URL } from 'url';
import { serveWebpackBrowser } from '../../index';
import {
  BASE_OPTIONS,
  BUILD_TIMEOUT,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('Behavior: "i18n $localize calls are replaced during watching"', () => {
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

      setupBrowserTarget(harness, { localize: ['fr'] });
    });

    it('$localize are replaced in watch', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
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
          timeout(BUILD_TIMEOUT),
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
  });
});
