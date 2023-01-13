/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalizeOptions } from './options';
import { Schema as WtrBuilderSchema } from './schema';

describe('options', () => {
  describe('normalizeOptions()', () => {
    const GOLDEN_SCHEMA: WtrBuilderSchema = {
      include: ['**/included/*.ts'],
      exclude: ['**/excluded/*.ts'],
      tsConfig: './tsconfig.json',
    };

    it('requires include and exclude properties', () => {
      const options = normalizeOptions({
        ...GOLDEN_SCHEMA,
        include: ['**/*.ts'],
        exclude: ['**/*.d.ts'],
      });

      expect(options).toContain({
        include: ['**/*.ts'],
        exclude: ['**/*.d.ts'],
      });

      // @ts-expect-error `undefined` should not be in the `include` type.
      options.include = undefined;

      // @ts-expect-error `undefined` should not be in the `exclude` type.
      options.exclude = undefined;
    });

    it('normalizes polyfills', () => {
      const stringPolyfillOptions = normalizeOptions({
        ...GOLDEN_SCHEMA,
        polyfills: './polyfills.ts',
      });

      expect(stringPolyfillOptions.polyfills).toEqual(['./polyfills.ts']);

      const arrayPolyfillOptions = normalizeOptions({
        ...GOLDEN_SCHEMA,
        polyfills: ['./first.ts', './second.ts'],
      });

      expect(arrayPolyfillOptions.polyfills).toEqual(['./first.ts', './second.ts']);
    });

    it('passes through other options', () => {
      const options = normalizeOptions({
        ...GOLDEN_SCHEMA,
        assets: ['./path/to/file.txt'],
      });

      expect(options.assets).toEqual(['./path/to/file.txt']);
    });
  });
});
