/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { map } from 'rxjs/operators';
import { formatValidator } from './format-validator';
import { pathFormat } from './path';


describe('Schematics Path format', () => {
  it('accepts correct Paths', done => {
    const data = { path: 'a/b/c' };
    const dataSchema = {
      properties: { path: { type: 'string', format: 'path' } },
    };

    formatValidator(data, dataSchema, [pathFormat])
      .pipe(map(result => expect(result.success).toBe(true)))
      .toPromise().then(done, done.fail);
  });

  it('rejects Paths that are not normalized', done => {
    const data = { path: 'a/b/c/../' };
    const dataSchema = {
      properties: { path: { type: 'string', format: 'path' } },
    };

    formatValidator(data, dataSchema, [pathFormat])
      .pipe(map(result => expect(result.success).toBe(false)))
      .toPromise().then(done, done.fail);
  });
});
