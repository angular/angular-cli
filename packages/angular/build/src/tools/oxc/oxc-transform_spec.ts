/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { transform } from './oxc-transform';

describe('oxc-transform sourcemaps', () => {
  it('should generate a sourcemap when sourcemap option is enabled without inputMap', () => {
    const input = 'var result = new SomeClass();';
    const result = transform('test.js', input, { sourcemap: true });

    expect(result.map).toBeDefined();
    const parsedMap = JSON.parse(result.map as string);
    expect(parsedMap.version).toBe(3);
    expect(parsedMap.sources).toContain('test.js');
    expect(parsedMap.mappings.length).toBeGreaterThan(0);
  });

  it('should remap with input sourcemap when sourcemap option is enabled and inputMap is present', () => {
    const inputMap = {
      version: 3,
      sources: ['original.ts'],
      sourcesContent: ['const result = new SomeClass();'],
      mappings: 'AAAA',
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(inputMap)).toString('base64');
    const input = `var result = new SomeClass();\n//# sourceMappingURL=data:application/json;base64,${base64Map}`;

    const result = transform('test.js', input, { sourcemap: true });

    expect(result.map).toBeDefined();
    const parsedMap = JSON.parse(result.map as string);
    expect(parsedMap.version).toBe(3);
    expect(parsedMap.sources).toContain('original.ts');
    expect(parsedMap.mappings.length).toBeGreaterThan(0);
  });
});
