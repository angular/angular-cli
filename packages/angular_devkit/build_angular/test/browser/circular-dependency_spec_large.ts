/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DefaultTimeout, TestLogger, runTargetSpec } from '@angular-devkit/architect/testing';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder circular dependency detection', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    host.appendToFile('src/app/app.component.ts',
      `import { AppModule } from './app.module'; console.log(AppModule);`);

    const overrides = { baseHref: '/myUrl' };
    const logger = new TestLogger('circular-dependencies');

    runTargetSpec(host, browserTargetSpec, overrides, DefaultTimeout, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(logger.includes('Circular dependency detected')).toBe(true)),
    ).toPromise().then(done, done.fail);
  });
});
