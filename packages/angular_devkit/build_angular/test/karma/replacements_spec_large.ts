/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { normalize } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { host, karmaTargetSpec } from '../utils';


describe('Karma Builder file replacements', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('allows file replacements', (done) => {
    host.writeMultipleFiles({
      'src/meaning-too.ts': 'export var meaning = 42;',
      'src/meaning.ts': `export var meaning = 10;`,

      'src/test.ts': `
        import { meaning } from './meaning';

        describe('Test file replacement', () => {
          it('should replace file', () => {
            expect(meaning).toBe(42);
          });
        });
      `,
    });

    const overrides = {
      fileReplacements: [{
        replace: normalize('/src/meaning.ts'),
        with: normalize('/src/meaning-too.ts'),
      }],
    };

    runTargetSpec(host, karmaTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 30000);
});
