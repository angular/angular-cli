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
import { Timeout, browserTargetSpec, host } from '../utils';


describe('Browser Builder service worker', () => {
  const manifest = {
    index: '/index.html',
    assetGroups: [
      {
        name: 'app',
        installMode: 'prefetch',
        resources: {
          files: ['/favicon.ico', '/index.html'],
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
          files: ['/assets/**'],
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
          navigationUrls: [
            { positive: true, regex: '^\\\/.*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\\\/]*\\.[^\\\/]*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\\\/]*__[^\\\/]*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\\\/]*__[^\\\/]*\\\/.*$' },
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
              ],
              patterns: [],
            },
          ],
          dataGroups: [],
          hashTable: {
            '/favicon.ico': '84161b857f5c547e3699ddfbffc6d8d737542e01',
            '/assets/folder-asset.txt': '617f202968a6a81050aa617c2e28e1dca11ce8d4',
            '/index.html': '843c96f0aeadc8f093b1b2203c08891ecd8f7425',
          },
        });
      }),
    ).toPromise().then(done, done.fail);
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
          navigationUrls: [
            { positive: true, regex: '^\\\/.*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\\\/]*\\.[^\\\/]*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\\\/]*__[^\\\/]*$' },
            { positive: false, regex: '^\\\/(?:.+\\\/)?[^\\\/]*__[^\\\/]*\\\/.*$' },
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
            '/foo/bar/index.html': '9ef50361678004b3b197c12cbc74962e5a15b844',
          },
        });
      }),
    ).toPromise().then(done, done.fail);
  }, Timeout.Basic);
});
