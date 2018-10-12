/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { TestLogger, runTargetSpec } from '@angular-devkit/architect/testing';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder no entry module', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    // Remove the bootstrap but keep a reference to AppModule so the import is not elided.
    host.replaceInFile('src/main.ts', /platformBrowserDynamic.*?bootstrapModule.*?;/, '');
    host.appendToFile('src/main.ts', 'console.log(AppModule);');

    const overrides = { baseHref: '/myUrl' };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  });

  it('reports warning when no bootstrap code', (done) => {
    host.replaceInFile('src/main.ts', /./g, '');
    host.appendToFile('src/main.ts', `import './app/app.module';`);

    const logger = new TestLogger('no-bootstrap');
    runTargetSpec(host, browserTargetSpec, undefined, undefined, logger).pipe(
      tap(() => expect(logger.includes('Lazy routes discovery is not enabled')).toBe(true)),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  });
});
