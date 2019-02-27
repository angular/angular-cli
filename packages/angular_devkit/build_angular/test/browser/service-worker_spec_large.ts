/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder service worker', () => {
  const manifest = {
    index: '/index.html',
    assetGroups: [
      {
        name: 'app',
        installMode: 'prefetch',
        resources: {
          files: [
            '/favicon.ico',
            '/index.html',
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
          files: [
            '/assets/**',
            '/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2|ani)',
          ],
        },
      },
    ],
  };

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('errors if no ngsw-config.json is present', (done) => {
    const overrides = { serviceWorker: true };

    runTargetSpec(host, browserTargetSpec, overrides)
      .subscribe(event => {
        expect(event.success).toBe(false);
      }, () => done(), done.fail);
  });

  it('works with service worker', (done) => {
    host.writeMultipleFiles({
      'src/ngsw-config.json': JSON.stringify(manifest),
      'src/assets/folder-asset.txt': 'folder-asset.txt',
      'src/styles.css': `body { background: url(./spectrum.png); }`,
    });

    const overrides = { serviceWorker: true };
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap(buildEvent => {
        expect(buildEvent.success).toBe(true);
        expect(host.scopedSync().exists(normalize('dist/ngsw.json')));
        const ngswJson = JSON.parse(virtualFs.fileBufferToString(
          host.scopedSync().read(normalize('dist/ngsw.json'))));
        // Verify index and assets are there.
        expect(ngswJson).toEqual(jasmine.objectContaining({
          configVersion: 1,
          index: '/index.html',
          navigationUrls: [
            { positive: true, regex: '^\\\/.*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*\\.[^\/]*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*__[^\/]*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*__[^\/]*\\\/.*$' },
          ],
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
                '/spectrum.png',
              ],
              patterns: [],
            },
          ],
          dataGroups: [],
          hashTable: {
            '/favicon.ico': '84161b857f5c547e3699ddfbffc6d8d737542e01',
            '/assets/folder-asset.txt': '617f202968a6a81050aa617c2e28e1dca11ce8d4',
            '/index.html': '1bcafd53046ffb270ac5e6f3cab23e0442f95c4f',
            '/spectrum.png': '8d048ece46c0f3af4b598a95fd8e4709b631c3c0',
          },
        }));
      }),
    ).toPromise().then(done, done.fail);
  });

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
        expect(ngswJson).toEqual(jasmine.objectContaining({
          configVersion: 1,
          index: '/foo/bar/index.html',
          navigationUrls: [
            { positive: true, regex: '^\\\/.*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*\\.[^\/]*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*__[^\/]*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\/]*__[^\/]*\\\/.*$' },
          ],
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
            '/foo/bar/favicon.ico': '84161b857f5c547e3699ddfbffc6d8d737542e01',
            '/foo/bar/assets/folder-asset.txt': '617f202968a6a81050aa617c2e28e1dca11ce8d4',
            '/foo/bar/index.html': '925d80777b6ba64b526b0be79761d254dfe94c65',
          },
        }));
      }),
    ).toPromise().then(done, done.fail);
  });
});
