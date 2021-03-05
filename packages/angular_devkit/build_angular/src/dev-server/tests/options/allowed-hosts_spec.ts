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
  BUILD_TIMEOUT,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

const FETCH_HEADERS = Object.freeze({ host: 'example.com' });

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  describe('option: "allowedHosts"', () => {
    beforeEach(async () => {
      setupBrowserTarget(harness);

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
    });

    it('does not allow an invalid host when option is not present', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      await harness
        .execute()
        .pipe(
          timeout(BUILD_TIMEOUT),
          mergeMap(async ({ result }) => {
            expect(result?.success).toBeTrue();

            if (result?.success) {
              const response = await fetch(`${result.baseUrl}`, { headers: FETCH_HEADERS });
              expect(await response.text()).toBe('Invalid Host header');
            }
          }),
          take(1),
        )
        .toPromise();
    });

    it('does not allow an invalid host when option is an empty array', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        allowedHosts: [],
      });

      await harness
        .execute()
        .pipe(
          timeout(BUILD_TIMEOUT),
          mergeMap(async ({ result }) => {
            expect(result?.success).toBeTrue();

            if (result?.success) {
              const response = await fetch(`${result.baseUrl}`, { headers: FETCH_HEADERS });
              expect(await response.text()).toBe('Invalid Host header');
            }
          }),
          take(1),
        )
        .toPromise();
    });

    it('allows a host when specified in the option', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        allowedHosts: ['example.com'],
      });

      await harness
        .execute()
        .pipe(
          timeout(BUILD_TIMEOUT),
          mergeMap(async ({ result }) => {
            expect(result?.success).toBeTrue();

            if (result?.success) {
              const response = await fetch(`${result.baseUrl}`, { headers: FETCH_HEADERS });
              expect(await response.text()).toContain('<title>');
            }
          }),
          take(1),
        )
        .toPromise();
    });
  });
});
