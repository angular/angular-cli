/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { formatValidator } from './format-validator';
import { pathFormat } from './path';

describe('Schematics Path format', () => {
  it('accepts correct Paths', async () => {
    const data = { path: 'a/b/c' };
    const dataSchema = {
      properties: { path: { type: 'string', format: 'path' } },
    };

    const result = await formatValidator(data, dataSchema, [pathFormat]);
    expect(result.success).toBeTrue();
  });

  it('rejects Paths that are not normalized', async () => {
    const data = { path: 'a/b/c/../' };
    const dataSchema = {
      properties: { path: { type: 'string', format: 'path' } },
    };

    const result = await formatValidator(data, dataSchema, [pathFormat]);
    expect(result.success).toBeFalse();
  });
});
