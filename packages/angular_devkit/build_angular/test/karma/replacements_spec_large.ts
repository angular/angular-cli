/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { host, karmaTargetSpec, runTargetSpec } from '../utils';


describe('Karma Builder file replacements', () => {
  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

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
        from: normalize('/src/meaning.ts'),
        to: normalize('/src/meaning-too.ts'),
      }],
    };

    runTargetSpec(host, karmaTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
