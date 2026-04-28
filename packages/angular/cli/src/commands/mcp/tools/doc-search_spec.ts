/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { resolveAlgoliaApiKey } from './doc-search';

describe('resolveAlgoliaApiKey', () => {
  const ENV_VAR = 'NG_DOCS_SEARCH_API_KEY';
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env[ENV_VAR];
    delete process.env[ENV_VAR];
  });

  afterEach(() => {
    if (saved === undefined) {
      delete process.env[ENV_VAR];
    } else {
      process.env[ENV_VAR] = saved;
    }
  });

  it('returns the env var value when set to a non-empty string', () => {
    process.env[ENV_VAR] = 'override-key-1234';

    expect(resolveAlgoliaApiKey()).toBe('override-key-1234');
  });

  it('falls back to the bundled default when the env var is unset', () => {
    delete process.env[ENV_VAR];

    expect(resolveAlgoliaApiKey()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('falls back to the bundled default when the env var is an empty string', () => {
    process.env[ENV_VAR] = '';

    expect(resolveAlgoliaApiKey()).toMatch(/^[0-9a-f]{32}$/);
  });
});
