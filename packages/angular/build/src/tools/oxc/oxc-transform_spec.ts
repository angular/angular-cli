/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { transform } from './oxc-transform';

describe('oxc-transform sourcemaps', () => {
  it('should generate a decoded sourcemap when sourcemap option is enabled', () => {
    const input = 'var result = new SomeClass();';
    const result = transform('test.js', input, { sourcemap: true });

    expect(result.map).toBeDefined();
    expect(result.map?.version).toBe(3);
    expect(result.map?.sources).toContain('test.js');
    expect(result.map?.mappings.length).toBeGreaterThan(0);
  });
});
