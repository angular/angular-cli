/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize, tags, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder base href', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    host.writeMultipleFiles({
      'src/my-js-file.js': `console.log(1); export const a = 2;`,
      'src/main.ts': `import { a } from './my-js-file'; console.log(a);`,
    });

    const overrides = { baseHref: '/myUrl' };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'index.html');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
        expect(content).toMatch(/<base href="\/myUrl">/);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('should insert base href in the the correct position', (done) => {
    host.writeMultipleFiles({
      'src/index.html': tags.oneLine`
        <html><head><meta charset="UTF-8"></head>
        <body><app-root></app-root></body></html>
      `,
    });

    const overrides = { baseHref: '/myUrl' };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'index.html');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
        expect(content).toContain('<head><base href="/myUrl"><meta charset="UTF-8"></head>');
      }),
    ).toPromise().then(done, done.fail);
  });
});
