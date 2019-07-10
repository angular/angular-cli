/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, virtualFs } from '@angular-devkit/core';
import { take, tap } from 'rxjs/operators';
import { createArchitect, host, outputPath } from '../utils';


describe('Browser Builder resolve json module', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works with watch', async () => {
    host.writeMultipleFiles({
      'src/my-json-file.json': `{"foo": "1"}`,
      'src/main.ts': `import * as a from './my-json-file.json'; console.log(a);`,
    });

    host.replaceInFile(
      'tsconfig.json',
      '"target": "es2015"',
      '"target": "es5", "resolveJsonModule": true',
    );

    const overrides = { watch: true };

    let buildCount = 1;
    const run = await architect.scheduleTarget(target, overrides);
    await run.output.pipe(
      tap(() => {
        const content = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );

        switch (buildCount) {
          case 1:
            expect(content).toContain('\\"foo\\":\\"1\\"');
            host.writeMultipleFiles({
              'src/my-json-file.json': `{"foo": "2"}`,
            });
            break;
          case 2:
            expect(content).toContain('\\"foo\\":\\"2\\"');
            break;
        }

        buildCount++;
      }),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      take(2),
    ).toPromise();
  });

});
