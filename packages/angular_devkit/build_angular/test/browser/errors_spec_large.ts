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


describe('Browser Builder errors', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('shows error when files are not part of the compilation', (done) => {
    host.replaceInFile('src/tsconfig.app.json', '"compilerOptions": {', `
      "files": ["main.ts"],
      "compilerOptions": {
    `);
    const logger = new TestLogger('errors-compilation');

    runTargetSpec(host, browserTargetSpec, {}, DefaultTimeout, logger).pipe(
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(false);
        expect(logger.includes('polyfills.ts is missing from the TypeScript')).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('shows TS syntax errors', (done) => {
    host.appendToFile('src/app/app.component.ts', ']]]');
    const logger = new TestLogger('errors-syntax');

    runTargetSpec(host, browserTargetSpec, {}, DefaultTimeout, logger).pipe(
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(false);
        expect(logger.includes('Declaration or statement expected.')).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('shows static analysis errors', (done) => {
    host.replaceInFile('src/app/app.component.ts', `'app-root'`, `(() => 'app-root')()`);
    const logger = new TestLogger('errors-static');

    runTargetSpec(host, browserTargetSpec, { aot: true }, DefaultTimeout, logger).pipe(
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(false);
        expect(logger.includes('Function expressions are not supported in')).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  });

});
