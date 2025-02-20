/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Architect } from '@angular-devkit/architect';

import { join, normalize, relative, virtualFs } from '@angular-devkit/core';
import { Observable, lastValueFrom, take, tap } from 'rxjs';
import { createArchitect, host } from '../../../testing/test-utils';
import { BrowserBuilderOutput } from '../index';

describe('Browser Builder allow js', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    host.writeMultipleFiles({
      'src/my-js-file.js': `console.log(1); export const a = 2;`,
      'src/main.ts': `import { a } from './my-js-file'; console.log(a);`,
    });

    host.replaceInFile(
      'tsconfig.json',
      '"target": "es2022"',
      '"target": "es2022", "allowJs": true',
    );

    const run = await architect.scheduleTarget(targetSpec);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);

    const content = virtualFs.fileBufferToString(
      await lastValueFrom(host.read(join(normalize(output.outputs[0].path), 'main.js'))),
    );

    expect(content).toContain('const a = 2');

    await run.stop();
  });

  it('works with aot', async () => {
    host.writeMultipleFiles({
      'src/my-js-file.js': `console.log(1); export const a = 2;`,
      'src/main.ts': `import { a } from './my-js-file'; console.log(a);`,
    });

    host.replaceInFile(
      'tsconfig.json',
      '"target": "es2022"',
      '"target": "es2022", "allowJs": true',
    );

    const overrides = { aot: true };

    const run = await architect.scheduleTarget(targetSpec, overrides);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);

    const content = virtualFs.fileBufferToString(
      await lastValueFrom(host.read(join(normalize(output.outputs[0].path), 'main.js'))),
    );

    expect(content).toContain('const a = 2');

    await run.stop();
  });

  it('works with watch', async () => {
    host.writeMultipleFiles({
      'src/my-js-file.js': `console.log(1); export const a = 2;`,
      'src/main.ts': `import { a } from './my-js-file'; console.log(a);`,
    });

    host.replaceInFile(
      'tsconfig.json',
      '"target": "es2022"',
      '"target": "es2022", "allowJs": true',
    );

    const overrides = { watch: true };

    let buildCount = 1;
    const run = await architect.scheduleTarget(targetSpec, overrides);

    await lastValueFrom(
      (run.output as Observable<BrowserBuilderOutput>).pipe(
        tap((output) => {
          const path = relative(host.root(), join(normalize(output.outputs[0].path), 'main.js'));
          const content = virtualFs.fileBufferToString(host.scopedSync().read(path));

          switch (buildCount) {
            case 1:
              expect(content).toContain('const a = 2');
              host.writeMultipleFiles({
                'src/my-js-file.js': `console.log(1); export const a = 1;`,
              });
              break;
            case 2:
              expect(content).toContain('const a = 1');
              break;
          }

          buildCount++;
        }),
        tap((buildEvent) => expect(buildEvent.success).toBe(true)),
        take(2),
      ),
    );

    await run.stop();
  });
});
