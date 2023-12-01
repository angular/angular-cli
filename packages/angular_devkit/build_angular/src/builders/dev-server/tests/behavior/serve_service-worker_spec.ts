/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { concatMap, count, take, timeout } from 'rxjs';
import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, BUILD_TIMEOUT, DEV_SERVER_BUILDER_INFO } from '../setup';

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
        files: [
          '/media/**',
          '/assets/**',
          '/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)',
        ],
      },
    },
  ],
};

describeServeBuilder(
  executeDevServer,
  DEV_SERVER_BUILDER_INFO,
  (harness, setupTarget, isViteRun) => {
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
        setupTarget(harness, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          serviceWorker: (isViteRun ? 'ngsw-config.json' : true) as any,
          resourcesOutputPath: isViteRun ? undefined : 'media',
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
                urls: ['/assets/folder-asset.txt', '/media/spectrum.png'],
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
              '/index.html': isViteRun
                ? 'e5b73e6798d2782bf59dd5272d254d5bde364695'
                : '9d232e3e13b4605d197037224a2a6303dd337480',
              '/media/spectrum.png': '8d048ece46c0f3af4b598a95fd8e4709b631c3c0',
            },
          }),
        );
      });

      it('works with localize', async () => {
        setupTarget(harness, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          serviceWorker: (isViteRun ? 'ngsw-config.json' : true) as any,
          resourcesOutputPath: isViteRun ? undefined : 'media',
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

      // TODO(fix-vite): currently this is broken in vite due to watcher never terminates.
      (isViteRun ? xit : it)('works in watch mode', async () => {
        setupTarget(harness, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          serviceWorker: (isViteRun ? 'ngsw-config.json' : true) as any,
          resourcesOutputPath: isViteRun ? undefined : 'media',
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
          watch: true,
        });

        const buildCount = await harness
          .execute()
          .pipe(
            timeout(BUILD_TIMEOUT),
            concatMap(async ({ result }, index) => {
              expect(result?.success).toBeTrue();
              const response = await fetch(new URL('ngsw.json', `${result?.baseUrl}`));
              const { hashTable } = (await response.json()) as { hashTable: object };
              const hashTableEntries = Object.keys(hashTable);

              switch (index) {
                case 0:
                  expect(hashTableEntries).toEqual([
                    '/assets/folder-asset.txt',
                    '/favicon.ico',
                    '/index.html',
                    '/media/spectrum.png',
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
                    '/media/spectrum.png',
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
  },
);
