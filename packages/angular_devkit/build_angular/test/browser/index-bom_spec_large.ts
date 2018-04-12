/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { Timeout, browserTargetSpec, host, runTargetSpec } from '../utils';


describe('Browser Builder works with BOM index.html', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works with UTF-8 BOM', (done) => {
    host.writeMultipleFiles({
      'src/index.html': Buffer.from(
        '\ufeff<html><head><base href="/"></head><body><app-root></app-root></body></html>',
        'utf8'),
    });

    runTargetSpec(host, browserTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'index.html');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        // tslint:disable-next-line:max-line-length
        expect(content).toBe(`<html><head><base href="/"></head><body><app-root></app-root><script type="text/javascript" src="runtime.js"></script><script type="text/javascript" src="polyfills.js"></script><script type="text/javascript" src="styles.js"></script><script type="text/javascript" src="vendor.js"></script><script type="text/javascript" src="main.js"></script></body></html>`);
      }),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);

  it('works with UTF16 LE BOM', (done) => {
    host.writeMultipleFiles({
      'src/index.html': Buffer.from(
        '\ufeff<html><head><base href="/"></head><body><app-root></app-root></body></html>',
        'utf16le'),
    });

    runTargetSpec(host, browserTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'index.html');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
        // tslint:disable-next-line:max-line-length
        expect(content).toBe(`<html><head><base href="/"></head><body><app-root></app-root><script type="text/javascript" src="runtime.js"></script><script type="text/javascript" src="polyfills.js"></script><script type="text/javascript" src="styles.js"></script><script type="text/javascript" src="vendor.js"></script><script type="text/javascript" src="main.js"></script></body></html>`);
      }),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);
});
