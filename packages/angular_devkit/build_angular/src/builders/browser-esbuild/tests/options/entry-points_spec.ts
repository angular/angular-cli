/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildEsbuildBrowserInternal } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildEsbuildBrowserInternal, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "entryPoints"', () => {
    it('provides multiple entry points', async () => {
      await harness.writeFiles({
        'src/entry1.ts': `console.log('entry1');`,
        'src/entry2.ts': `console.log('entry2');`,
        'tsconfig.app.json': `
          {
            "extends": "./tsconfig.json",
            "files": ["src/entry1.ts", "src/entry2.ts"]
          }
        `,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        main: undefined,
        tsConfig: 'tsconfig.app.json',
        entryPoints: new Set(['src/entry1.ts', 'src/entry2.ts']),
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/entry1.js').toExist();
      harness.expectFile('dist/entry2.js').toExist();
    });

    it('throws when `main` is omitted and an empty `entryPoints` Set is provided', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        main: undefined,
        entryPoints: new Set(),
      });

      const { result, error } = await harness.executeOnce();
      expect(result).toBeUndefined();

      expect(error?.message).toContain('Either `main` or at least one `entryPoints`');
    });

    it('throws when provided with a `main` option', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        main: 'src/main.ts',
        entryPoints: new Set(['src/entry.ts']),
      });

      const { result, error } = await harness.executeOnce();
      expect(result).toBeUndefined();

      expect(error?.message).toContain('Only one of `main` or `entryPoints` may be provided.');
    });
  });
});
