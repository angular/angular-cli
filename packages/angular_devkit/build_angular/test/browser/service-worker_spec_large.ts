/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { Timeout, browserTargetSpec, host, runTargetSpec } from '../utils';


describe('Browser Builder', () => {
  const manifest = {
    index: '/index.html',
    assetGroups: [
      {
        name: 'app',
        installMode: 'prefetch',
        resources: {
          files: [ '/favicon.ico', '/index.html' ],
          versionedFiles: [
            '/*.bundle.css',
            '/*.bundle.js',
            '/*.chunk.js',
          ],
        },
      },
      {
        name: 'assets',
        installMode: 'lazy',
        updateMode: 'prefetch',
        resources: {
          files: [ '/assets/**' ],
        },
      },
    ],
  };

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('errors if no ngsw-config.json is present', (done) => {
    const overrides = { serviceWorker: true };

    runTargetSpec(host, browserTargetSpec, overrides)
      .subscribe(event => {
        expect(event.success).toBe(false);
      }, done, done.fail);
  }, Timeout.Basic);

  it('works with service worker', (done) => {
    host.writeMultipleFiles({
      'src/ngsw-config.json': JSON.stringify(manifest),
      'src/assets/folder-asset.txt': 'folder-asset.txt',
    });

    const overrides = { serviceWorker: true };
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap(buildEvent => {
        expect(buildEvent.success).toBe(true);
        expect(host.scopedSync().exists(normalize('dist/ngsw.json')));
        const ngswJson = JSON.parse(virtualFs.fileBufferToString(
          host.scopedSync().read(normalize('dist/ngsw.json'))));
        // Verify index and assets are there.
        expect(ngswJson).toEqual({
          configVersion: 1,
          index: '/index.html',
          assetGroups: [
            {
              name: 'app',
              installMode: 'prefetch',
              updateMode: 'prefetch',
              urls: [
                '/favicon.ico',
                '/index.html',
              ],
              patterns: [],
            },
            {
              name: 'assets',
              installMode: 'lazy',
              updateMode: 'prefetch',
              urls: [
                '/assets/folder-asset.txt',
              ],
              patterns: [],
            },
          ],
          dataGroups: [],
          hashTable: {
            '/favicon.ico': '460fcbd48b20fcc32b184388606af1238c890dba',
            '/assets/folder-asset.txt': '617f202968a6a81050aa617c2e28e1dca11ce8d4',
            '/index.html': '3e659d6e536916b7d178d02a2e6e5492f868bf68',
          },
        });
      }),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);

  it('works with service worker and baseHref', (done) => {
    host.writeMultipleFiles({
      'src/ngsw-config.json': JSON.stringify(manifest),
      'src/assets/folder-asset.txt': 'folder-asset.txt',
    });

    const overrides = { serviceWorker: true, baseHref: '/foo/bar' };
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap(buildEvent => {
        expect(buildEvent.success).toBe(true);
        expect(host.scopedSync().exists(normalize('dist/ngsw.json')));
        const ngswJson = JSON.parse(virtualFs.fileBufferToString(
          host.scopedSync().read(normalize('dist/ngsw.json'))));
        // Verify index and assets include the base href.
        expect(ngswJson).toEqual({
          configVersion: 1,
          index: '/foo/bar/index.html',
          assetGroups: [
            {
              name: 'app',
              installMode: 'prefetch',
              updateMode: 'prefetch',
              urls: [
                '/foo/bar/favicon.ico',
                '/foo/bar/index.html',
              ],
              patterns: [],
            },
            {
              name: 'assets',
              installMode: 'lazy',
              updateMode: 'prefetch',
              urls: [
                '/foo/bar/assets/folder-asset.txt',
              ],
              patterns: [],
            },
          ],
          dataGroups: [],
          hashTable: {
            '/foo/bar/favicon.ico': '460fcbd48b20fcc32b184388606af1238c890dba',
            '/foo/bar/assets/folder-asset.txt': '617f202968a6a81050aa617c2e28e1dca11ce8d4',
            '/foo/bar/index.html': '5b53fa9e07e4111b8ef84613fb989a56fee502b0',
          },
        });
      }),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);
});
