/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host, runTargetSpec } from '../utils';


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
  }, 30000);

  it('works with service worker', (done) => {
    host.writeMultipleFiles({
      'src/ngsw-config.json': JSON.stringify(manifest),
    });

    const overrides = { serviceWorker: true };
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap(buildEvent => {
        expect(buildEvent.success).toBe(true);
        expect(host.scopedSync().exists(normalize('dist/ngsw.json')));
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('works with service worker and baseHref', (done) => {
    host.writeMultipleFiles({
      'src/ngsw-config.json': JSON.stringify(manifest),
    });

    const overrides = { serviceWorker: true, baseHref: '/foo/bar' };
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap(buildEvent => {
        expect(buildEvent.success).toBe(true);
        expect(host.scopedSync().exists(normalize('dist/ngsw.json')));
        expect(virtualFs.fileBufferToString(
          host.scopedSync().read(normalize('dist/ngsw.json')),
        )).toMatch(/"\/foo\/bar\/index.html"/);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
