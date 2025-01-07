/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { debounceTime, take, tap } from 'rxjs';
import { createArchitect, host } from '../../../testing/test-utils';

describe('Browser Builder service worker', () => {
  const manifest = {
    index: '/index.html',
    assetGroups: [
      {
        name: 'app',
        installMode: 'prefetch',
        resources: {
          files: ['/favicon.ico', '/index.html', '/*.bundle.css', '/*.bundle.js', '/*.chunk.js'],
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

  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(async () => host.restore().toPromise());

  it('errors if no ngsw-config.json is present', async () => {
    const overrides = { serviceWorker: true };
    await host.delete(join(host.root(), 'src/ngsw-config.json')).toPromise();

    const run = await architect.scheduleTarget(target, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: false }));

    await run.stop();
  });

  it('supports specifying a custom service worker configuration file', async () => {
    host.writeMultipleFiles({
      'src/configs/ngsw.json': JSON.stringify(manifest),
      'src/assets/folder-asset.txt': 'folder-asset.txt',
      'src/styles.css': `body { background: url(./spectrum.png); }`,
    });

    const overrides = { serviceWorker: true, ngswConfigPath: 'src/configs/ngsw.json' };

    const run = await architect.scheduleTarget(target, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    expect(host.scopedSync().exists(normalize('dist/ngsw.json'))).toBeTrue();
  });

  it('works with service worker', async () => {
    host.writeMultipleFiles({
      'src/ngsw-config.json': JSON.stringify(manifest),
      'src/assets/folder-asset.txt': 'folder-asset.txt',
      'src/styles.css': `body { background: url(./spectrum.png); }`,
    });

    const overrides = { serviceWorker: true };
    const run = await architect.scheduleTarget(target, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    expect(host.scopedSync().exists(normalize('dist/ngsw.json'))).toBeTrue();
    const ngswJson = JSON.parse(
      virtualFs.fileBufferToString(host.scopedSync().read(normalize('dist/ngsw.json'))),
    );
    // Verify index and assets are there.
    expect(ngswJson).toEqual(
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
          '/index.html': '8964a35a8b850942f8d18ba919f248762ff3154d',
          '/spectrum.png': '8d048ece46c0f3af4b598a95fd8e4709b631c3c0',
        },
      }),
    );

    await run.stop();
  });

  it('works in watch mode', async () => {
    host.writeMultipleFiles({
      'src/ngsw-config.json': JSON.stringify(manifest),
      'src/assets/folder-asset.txt': 'folder-asset.txt',
      'src/styles.css': `body { background: url(./spectrum.png); }`,
    });

    const overrides = { serviceWorker: true, watch: true };
    const run = await architect.scheduleTarget(target, overrides);
    let buildNumber = 0;

    await run.output
      .pipe(
        debounceTime(1000),
        tap((buildEvent) => {
          expect(buildEvent.success).toBeTrue();

          const ngswJsonPath = normalize('dist/ngsw.json');
          expect(host.scopedSync().exists(ngswJsonPath)).toBeTrue();
          const ngswJson = JSON.parse(
            virtualFs.fileBufferToString(host.scopedSync().read(ngswJsonPath)),
          );

          const hashTableEntries = Object.keys(ngswJson.hashTable);

          buildNumber += 1;
          switch (buildNumber) {
            case 1:
              expect(hashTableEntries).toEqual([
                '/assets/folder-asset.txt',
                '/favicon.ico',
                '/index.html',
                '/spectrum.png',
              ]);

              host.copyFile('src/assets/folder-asset.txt', 'src/assets/folder-new-asset.txt');
              break;

            case 2:
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
      )
      .toPromise();

    await run.stop();
  });

  it('works with service worker and baseHref', async () => {
    host.writeMultipleFiles({
      'src/ngsw-config.json': JSON.stringify(manifest),
      'src/assets/folder-asset.txt': 'folder-asset.txt',
    });

    const overrides = { serviceWorker: true, baseHref: '/foo/bar' };
    const run = await architect.scheduleTarget(target, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    expect(host.scopedSync().exists(normalize('dist/ngsw.json'))).toBeTrue();
    const ngswJson = JSON.parse(
      virtualFs.fileBufferToString(host.scopedSync().read(normalize('dist/ngsw.json'))),
    );
    // Verify index and assets include the base href.
    expect(ngswJson).toEqual(
      jasmine.objectContaining({
        configVersion: 1,
        index: '/foo/bar/index.html',
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
            urls: ['/foo/bar/favicon.ico', '/foo/bar/index.html'],
            patterns: [],
            cacheQueryOptions: {
              ignoreVary: true,
            },
          },
          {
            name: 'assets',
            installMode: 'lazy',
            updateMode: 'prefetch',
            urls: ['/foo/bar/assets/folder-asset.txt'],
            patterns: [],
            cacheQueryOptions: {
              ignoreVary: true,
            },
          },
        ],
        dataGroups: [],
        hashTable: {
          '/foo/bar/favicon.ico': '84161b857f5c547e3699ddfbffc6d8d737542e01',
          '/foo/bar/assets/folder-asset.txt': '617f202968a6a81050aa617c2e28e1dca11ce8d4',
          '/foo/bar/index.html': '5c99755c1e7cfd1c8aba34ad1155afc72a288fec',
        },
      }),
    );

    await run.stop();
  });
});
