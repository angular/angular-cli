/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, virtualFs } from '@angular-devkit/core';
import { take, tap } from 'rxjs/operators';
import { browserTargetSpec, host, outputPath } from '../utils';


describe('Browser Builder resolve json module', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works with watch', (done) => {
    host.writeMultipleFiles({
      'src/my-json-file.json': `{"foo": "1"}`,
      'src/main.ts': `import * as a from './my-json-file.json'; console.log(a);`,
    });

    host.replaceInFile(
      'tsconfig.json',
      '"target": "es5"',
      '"target": "es5", "resolveJsonModule": true',
    );

    const overrides = { watch: true };

    let buildCount = 1;
    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap(() => {
        const content = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );

        switch (buildCount) {
          case 1:
            expect(content).toContain('foo":"1"');
            host.writeMultipleFiles({
              'src/my-json-file.json': `{"foo": "2"}`,
            });
            break;
          case 2:
            expect(content).toContain('foo":"2"');
            break;
        }

        buildCount++;
      }),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      take(2),
    ).toPromise().then(done, done.fail);
  });

});
