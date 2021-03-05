/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import fetch from 'node-fetch'; // tslint:disable-line:no-implicit-dependencies
import { mergeMap, take, timeout } from 'rxjs/operators';
import { serveWebpackBrowser } from '../../index';
import {
  BASE_OPTIONS,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('Behavior: "browser builder inline critical css"', () => {
    beforeEach(async () => {
      setupBrowserTarget(harness, {
        optimization: {
          styles: {
            minify: true,
            inlineCritical: true,
          },
        },
        styles: ['src/styles.css'],
      });

      await harness.writeFiles({
        'src/styles.css': 'body { color: #000 }',
      });

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
    });

    it('inlines critical css when enabled in the "browserTarget" options', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      await harness
        .execute()
        .pipe(
          timeout(39000),
          mergeMap(async ({ result }) => {
            expect(result?.success).toBeTrue();

            if (result?.success) {
              const response = await fetch(`${result.baseUrl}index.html`);
              expect(await response.text()).toContain(`body{color:#000;}`);
            }
          }),
          take(1),
        )
        .toPromise();
    });
  });
});
