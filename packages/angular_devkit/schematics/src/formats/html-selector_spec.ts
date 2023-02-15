/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { formatValidator } from './format-validator';
import { htmlSelectorFormat } from './html-selector';

describe('Schematics HTML selector format', () => {
  it('accepts correct selectors', async () => {
    const data = { selector: 'my-selector' };
    const dataSchema = {
      properties: { selector: { type: 'string', format: 'html-selector' } },
    };

    const result = await formatValidator(data, dataSchema, [htmlSelectorFormat]);
    expect(result.success).toBeTrue();
  });

  it('rejects selectors starting with invalid characters', async () => {
    const data = { selector: 'my-selector$' };
    const dataSchema = {
      properties: { selector: { type: 'string', format: 'html-selector' } },
    };

    const result = await formatValidator(data, dataSchema, [htmlSelectorFormat]);
    expect(result.success).toBeFalse();
  });

  it('rejects selectors starting with number', async () => {
    const data = { selector: '1selector' };
    const dataSchema = {
      properties: { selector: { type: 'string', format: 'html-selector' } },
    };

    const result = await formatValidator(data, dataSchema, [htmlSelectorFormat]);
    expect(result.success).toBeFalse();
  });

  it('accepts selectors with non-letter after dash', async () => {
    const data = { selector: 'my-1selector' };
    const dataSchema = {
      properties: { selector: { type: 'string', format: 'html-selector' } },
    };

    const result = await formatValidator(data, dataSchema, [htmlSelectorFormat]);
    expect(result.success).toBeTrue();
  });

  it('accepts selectors with unicode', async () => {
    const data = { selector: 'app-root😀' };
    const dataSchema = {
      properties: { selector: { type: 'string', format: 'html-selector' } },
    };

    const result = await formatValidator(data, dataSchema, [htmlSelectorFormat]);
    expect(result.success).toBeTrue();
  });
});
