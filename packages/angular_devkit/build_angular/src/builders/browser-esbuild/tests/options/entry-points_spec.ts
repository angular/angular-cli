/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { buildEsbuildBrowserInternal } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildEsbuildBrowserInternal, BROWSER_BUILDER_INFO, (harness) => {
  let tempDir!: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'angular-cli-e2e-browser-esbuild-main-spec-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

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

    it('resolves entry points outside the workspace root', async () => {
      const entry = path.join(tempDir, 'entry.mjs');
      await fs.writeFile(entry, `console.log('entry');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        main: undefined,
        entryPoints: new Set([entry]),
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/entry.js').toExist();
    });

    it('throws an error when multiple entry points output to the same location', async () => {
      // Would generate `/entry.mjs` in the output directory.
      const entry1 = path.join(tempDir, 'entry.mjs');
      await fs.writeFile(entry1, `console.log('entry1');`);

      // Would also generate `/entry.mjs` in the output directory.
      const subDir = path.join(tempDir, 'subdir');
      await fs.mkdir(subDir);
      const entry2 = path.join(subDir, 'entry.mjs');
      await fs.writeFile(entry2, `console.log('entry2');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        main: undefined,
        entryPoints: new Set([entry1, entry2]),
      });

      const { result, error } = await harness.executeOnce();
      expect(result).toBeUndefined();

      expect(error?.message).toContain(entry1);
      expect(error?.message).toContain(entry2);
      expect(error?.message).toContain('both output to the same location');
    });
  });
});
