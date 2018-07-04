/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { browserTargetSpec, host } from '../utils';


describe('Browser Builder file replacements', () => {
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  beforeEach(() => host.writeMultipleFiles({
    'src/meaning-too.ts': 'export var meaning = 42;',
    'src/meaning.ts': `export var meaning = 10;`,

    'src/main.ts': `
        import { meaning } from './meaning';

        console.log(meaning);
      `,
  }));

  it('allows file replacements', (done) => {
    const overrides = {
      fileReplacements: [
        {
          replace: normalize('/src/meaning.ts'),
          with: normalize('/src/meaning-too.ts'),
        },
      ],
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js');
        expect(virtualFs.fileBufferToString(host.scopedSync().read(fileName)))
          .toMatch(/meaning\s*=\s*42/);
        expect(virtualFs.fileBufferToString(host.scopedSync().read(fileName)))
          .not.toMatch(/meaning\s*=\s*10/);
      }),
    ).toPromise().then(done, done.fail);
  });

  it(`allows file replacements with deprecated format`, (done) => {
    const overrides = {
      fileReplacements: [
        {
          src: normalize('/src/meaning.ts'),
          replaceWith: normalize('/src/meaning-too.ts'),
        },
      ],
    };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'main.js');
        expect(virtualFs.fileBufferToString(host.scopedSync().read(fileName)))
          .toMatch(/meaning\s*=\s*42/);
        expect(virtualFs.fileBufferToString(host.scopedSync().read(fileName)))
          .not.toMatch(/meaning\s*=\s*10/);
      }),
    ).toPromise().then(done, done.fail);
  });

  it(`fails compilation with missing 'replace' file`, (done) => {
    const overrides = {
      fileReplacements: [
        {
          replace: normalize('/src/meaning.ts'),
          with: normalize('/src/meaning-three.ts'),
        },
      ],
    };

    runTargetSpec(host, browserTargetSpec, overrides)
      .subscribe(undefined, () => done(), done.fail);
  });

  it(`fails compilation with missing 'with' file`, (done) => {
    const overrides = {
      fileReplacements: [
        {
          replace: normalize('/src/meaning-three.ts'),
          with: normalize('/src/meaning-too.ts'),
        },
      ],
    };

    runTargetSpec(host, browserTargetSpec, overrides)
      .subscribe(undefined, () => done(), done.fail);
  });
});
