/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tap } from 'rxjs/operators';
import { TestLogger, Timeout, browserTargetSpec, host, runTargetSpec } from '../utils';


describe('Browser Builder circular dependency detection', () => {
  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    host.appendToFile('src/app/app.component.ts',
      `import { AppModule } from './app.module'; console.log(AppModule);`);

    const overrides = { baseHref: '/myUrl' };
    const logger = new TestLogger('circular-dependencies');

    runTargetSpec(host, browserTargetSpec, overrides, logger).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(logger.includes('Circular dependency detected')).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, Timeout.Basic);
});
