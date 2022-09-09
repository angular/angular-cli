/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import fetch from 'node-fetch';
import { concatMap, count, take, timeout } from 'rxjs/operators';
import { serveWebpackBrowser } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import {
  BASE_OPTIONS,
  BUILD_TIMEOUT,
  DEV_SERVER_BUILDER_INFO,
  describeBuilder,
  setupBrowserTarget,
} from '../setup';

describeBuilder(serveWebpackBrowser, DEV_SERVER_BUILDER_INFO, (harness) => {
  const manifest = {
    index: '/index.html',
    assetGroups: [
      {
        name: 'app',
        installMode: 'prefetch',
        resources: {
          files: ['/favicon.ico', '/index.html'],
        },
      },
      {
        name: 'assets',
        installMode: 'lazy',
        updateMode: 'prefetch',
        resources: {
          files: ['/assets/**', '/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)'],
        },
      },
    ],
  };

  describe('Behavior: "dev-server builder serves service worker"', () => {
    beforeEach(async () => {
      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
      await harness.writeFile('src/polyfills.ts', '');

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
    });

    it('works with service worker', async () => {
      setupBrowserTarget(harness, {
        serviceWorker: true,
        assets: ['src/favicon.ico', 'src/assets'],
        styles: ['src/styles.css'],
      });

      await harness.writeFiles({
        'ngsw-config.json': JSON.stringify(manifest),
        'src/assets/folder-asset.txt': 'folder-asset.txt',
        'src/styles.css': `body { background: url(./spectrum.png); }`,
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, '/ngsw.json');

      expect(result?.success).toBeTrue();

      expect(await response?.json()).toEqual(
        jasmine.objectContaining({
          configVersion: 1,
          index: '/index.html',
          navigationUrls: [
            { positive: true, regex: '^\\/.*$' },
            { positive: false, regex: '^\\/(?:.+\\/)?[^/]*\\.[^/]*$' },
            { positive: false, regex: '^\\/(?:.+\\/)?[^/]*__[^/]*$' },
            { positive: false, regex: '^\\/(?:.+\\/)?[^/]*__[^/]*\\/.*$' },
          ],
          assetGroups: [
            {
              name: 'app',
              installMode: 'prefetch',
              updateMode: 'prefetch',
              urls: ['/favicon.ico', '/index.html'],
              cacheQueryOptions: {
                ignoreVary: true,
              },
              patterns: [],
            },
            {
              name: 'assets',
              installMode: 'lazy',
              updateMode: 'prefetch',
              urls: ['/assets/folder-asset.txt', '/spectrum.png'],
              cacheQueryOptions: {
                ignoreVary: true,
              },
              patterns: [],
            },
          ],
          dataGroups: [],
          hashTable: {
            '/favicon.ico': '84161b857f5c547e3699ddfbffc6d8d737542e01',
            '/assets/folder-asset.txt': '617f202968a6a81050aa617c2e28e1dca11ce8d4',
            '/index.html': '9d232e3e13b4605d197037224a2a6303dd337480',
            '/spectrum.png': '8d048ece46c0f3af4b598a95fd8e4709b631c3c0',
          },
        }),
      );
    });

    it('works with localize', async () => {
      setupBrowserTarget(harness, {
        serviceWorker: true,
        assets: ['src/favicon.ico', 'src/assets'],
        styles: ['src/styles.css'],
        localize: ['fr'],
      });

      await harness.writeFiles({
        'ngsw-config.json': JSON.stringify(manifest),
        'src/assets/folder-asset.txt': 'folder-asset.txt',
        'src/styles.css': `body { background: url(./spectrum.png); }`,
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, '/ngsw.json');

      expect(result?.success).toBeTrue();

      expect(await response?.json()).toBeDefined();
    });

    it('works in watch mode', async () => {
      setupBrowserTarget(harness, {
        serviceWorker: true,
        watch: true,
        assets: ['src/favicon.ico', 'src/assets'],
        styles: ['src/styles.css'],
      });

      await harness.writeFiles({
        'ngsw-config.json': JSON.stringify(manifest),
        'src/assets/folder-asset.txt': 'folder-asset.txt',
        'src/styles.css': `body { background: url(./spectrum.png); }`,
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const buildCount = await harness
        .execute()
        .pipe(
          timeout(BUILD_TIMEOUT),
          concatMap(async ({ result }, index) => {
            expect(result?.success).toBeTrue();
            const response = await fetch(new URL('ngsw.json', `${result?.baseUrl}`));
            const { hashTable } = await response.json();
            const hashTableEntries = Object.keys(hashTable);

            switch (index) {
              case 0:
                expect(hashTableEntries).toEqual([
                  '/assets/folder-asset.txt',
                  '/favicon.ico',
                  '/index.html',
                  '/spectrum.png',
                ]);

                await harness.writeFile(
                  'src/assets/folder-new-asset.txt',
                  harness.readFile('src/assets/folder-asset.txt'),
                );
                break;

              case 1:
                expect(hashTableEntries).toEqual([
                  '/assets/folder-asset.txt',
                  '/assets/folder-new-asset.txt',
                  '/favicon.ico',
                  '/index.html',
                  '/spectrum.png',
                ]);
                break;
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
