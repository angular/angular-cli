/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { TestLogger } from '@angular-devkit/architect/testing';
import { normalize, virtualFs } from '@angular-devkit/core';
import { of, race } from 'rxjs';
import { delay, filter, map, take, takeUntil, takeWhile, tap, timeout } from 'rxjs/operators';
import { browserBuild, createArchitect, host } from '../utils';


describe('Browser Builder file replacements', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  beforeEach(() => host.writeMultipleFiles({
    'src/meaning-too.ts': 'export var meaning = 42;',
    'src/meaning.ts': `export var meaning = 10;`,

    'src/main.ts': `
        import { meaning } from './meaning';

        console.log(meaning);
      `,
  }));

  it('allows file replacements', async () => {
    const overrides = {
      fileReplacements: [
        {
          replace: normalize('/src/meaning.ts'),
          with: normalize('/src/meaning-too.ts'),
        },
      ],
    };

    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['main.js']).toMatch(/meaning\s*=\s*42/);
    expect(await files['main.js']).not.toMatch(/meaning\s*=\s*10/);
  });

  it(`allows file replacements with deprecated format`, async () => {
    const overrides = {
      fileReplacements: [
        {
          src: normalize('/src/meaning.ts'),
          replaceWith: normalize('/src/meaning-too.ts'),
        },
      ],
    };

    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['main.js']).toMatch(/meaning\s*=\s*42/);
    expect(await files['main.js']).not.toMatch(/meaning\s*=\s*10/);
  });

  it(`fails compilation with missing 'replace' file`, async () => {
    const overrides = {
      fileReplacements: [
        {
          replace: normalize('/src/meaning.ts'),
          with: normalize('/src/meaning-three.ts'),
        },
      ],
    };

    const run = await architect.scheduleTarget(target, overrides);
    try {
      await run.result;
      expect('THE ABOVE LINE SHOULD THROW').toBe('');
    } catch {}
    await run.stop();
  });

  it(`fails compilation with missing 'with' file`, async () => {
    const overrides = {
      fileReplacements: [
        {
          replace: normalize('/src/meaning-three.ts'),
          with: normalize('/src/meaning-too.ts'),
        },
      ],
    };

    const run = await architect.scheduleTarget(target, overrides);
    try {
      await run.result;
      expect('THE ABOVE LINE SHOULD THROW').toBe('');
    } catch {}
    await run.stop();
  });

  it('file replacements work with watch mode', async () => {
    const overrides = {
      fileReplacements: [
        {
          replace: normalize('/src/meaning.ts'),
          with: normalize('/src/meaning-too.ts'),
        },
      ],
      watch: true,
    };

    let buildCount = 0;
    let phase = 1;

    const run = await architect.scheduleTarget(target, overrides);
    await run.output.pipe(
      timeout(30000),
      tap((result) => {
        expect(result.success).toBe(true, 'build should succeed');

        const fileName = normalize('dist/main.js');
        const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
        const has42 = /meaning\s*=\s*42/.test(content);
        buildCount++;
        switch (phase) {
          case 1:
            const has10 = /meaning\s*=\s*10/.test(content);

            if (has42 && !has10) {
              phase = 2;
              host.writeMultipleFiles({
                'src/meaning-too.ts': 'export var meaning = 84;',
              });
            }
            break;

          case 2:
            const has84 = /meaning\s*=\s*84/.test(content);

            if (has84 && !has42) {
              phase = 3;
            } else {
              // try triggering a rebuild again
              host.writeMultipleFiles({
                'src/meaning-too.ts': 'export var meaning = 84;',
              });
            }
            break;
        }
      }),
      takeWhile(() => phase < 3),
    ).toPromise().catch(() => {
      throw new Error(`stuck at phase ${phase} [builds: ${buildCount}]`);
    });

    await run.stop();
  });

  it('file replacements work with forked type checker on watch mode', async () => {
    host.writeMultipleFiles({
      'src/file-replaced.ts': 'export var obj = { one: 1, two: 2 };',
      'src/file.ts': `export var obj = { one: 1 };`,
      'src/main.ts': `
        import { obj } from './file';
        console.log(obj.two);
      `,
    });

    const overrides = {
      fileReplacements: [{
        replace: normalize('/src/file.ts'),
        with: normalize('/src/file-replaced.ts'),
      }],
      watch: true,
    };

    const unexpectedError = `Property 'two' does not exist on type '{ one: number; }'`;
    const expectedError = `Property 'prop' does not exist on type '{}'`;
    const logger = new TestLogger('rebuild-type-errors');

    // Race between a timeout and the expected log entry.
    const stop$ = race<null | string>(
      of(null).pipe(delay(45000 * 2 / 3)),
      logger.pipe(
        filter(entry => entry.message.includes(expectedError)),
        map(entry => entry.message),
        take(1),
      ),
    );

    let errorAdded = false;
    const run = await architect.scheduleTarget(target, overrides, { logger });
    run.output.pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true, 'build should succeed')),
      tap(() => {
        // Introduce a known type error to detect in the logger filter.
        if (!errorAdded) {
          host.appendToFile('src/main.ts', 'console.log({}.prop);');
          errorAdded = true;
        }
      }),
      takeUntil(stop$),
    ).subscribe();

    const res = await stop$.toPromise();
    expect(res).not.toBe(null, 'Test timed out.');
    expect(res).not.toContain(unexpectedError);
    await run.stop();
  });
});
