/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, virtualFs } from '@angular-devkit/core';
import { debounceTime, take, tap } from 'rxjs/operators';
import { browserTargetSpec, host, outputPath } from '../utils';


describe('Browser Builder allow js', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    host.writeMultipleFiles({
      'src/my-js-file.js': `console.log(1); export const a = 2;`,
      'src/main.ts': `import { a } from './my-js-file'; console.log(a);`,
    });

    host.replaceInFile(
      'tsconfig.json',
      '"target": "es5"',
      '"target": "es5", "allowJs": true',
    );

    runTargetSpec(host, browserTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const content = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );

        expect(content).toContain('var a = 2');
      }),
    ).toPromise().then(done, done.fail);
  });

  it('works with aot', (done) => {
    host.writeMultipleFiles({
      'src/my-js-file.js': `console.log(1); export const a = 2;`,
      'src/main.ts': `import { a } from './my-js-file'; console.log(a);`,
    });

    host.replaceInFile(
      'tsconfig.json',
      '"target": "es5"',
      '"target": "es5", "allowJs": true',
    );

    const overrides = { aot: true };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const content = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );

        expect(content).toContain('var a = 2');
      }),
    ).toPromise().then(done, done.fail);
  });

  it('works with watch', (done) => {
    host.writeMultipleFiles({
      'src/my-js-file.js': `console.log(1); export const a = 2;`,
      'src/main.ts': `import { a } from './my-js-file'; console.log(a);`,
    });

    host.replaceInFile(
      'tsconfig.json',
      '"target": "es5"',
      '"target": "es5", "allowJs": true',
    );

    const overrides = { watch: true };

    let buildCount = 1;
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      debounceTime(1000),
      tap(() => {
        const content = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );

        switch (buildCount) {
          case 1:
            expect(content).toContain('var a = 2');
            host.writeMultipleFiles({
              'src/my-js-file.js': `console.log(1); export const a = 1;`,
            });
            break;
          case 2:
            expect(content).toContain('var a = 1');
            break;
        }

        buildCount++;
      }),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      take(2),
    ).toPromise().then(done, done.fail);
  });

});
