/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeLibraryBuilder } from '../../builder';
import { BASE_OPTIONS, LIBRARY_BUILDER_INFO, describeLibraryBuilder } from '../setup';

describeLibraryBuilder(executeLibraryBuilder, LIBRARY_BUILDER_INFO, (harness) => {
  describe('Option: "entryPoints"', () => {
    it('should succeed when entry point is a .ts file', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        entryPoints: {
          '.': 'projects/lib/src/public-api.ts',
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should succeed when entry point is a .mts file', async () => {
      await harness.writeFiles({
        'projects/lib/src/public-api.mts': 'export const VALUE = 42;\n',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        entryPoints: {
          '.': 'projects/lib/src/public-api.mts',
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should fail when entry point is not a .ts or .mts file', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        entryPoints: {
          '.': 'projects/lib/src/public-api.cts',
        },
      });

      const { result, error } = await harness.executeOnce({
        outputLogsOnException: false,
        outputLogsOnFailure: false,
      });
      expect(result).toBeUndefined();
      expect(error).toBeDefined();
      expect((error as Error).message).toMatch(/must be a TypeScript file \('\.ts' or '\.mts'\)/);
    });

    it('should fail when entry point is a declaration file', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        entryPoints: {
          '.': 'projects/lib/src/public-api.d.ts',
        },
      });

      const { result, error } = await harness.executeOnce({
        outputLogsOnException: false,
        outputLogsOnFailure: false,
      });
      expect(result).toBeUndefined();
      expect(error).toBeDefined();
      expect((error as Error).message).toMatch(/must be a TypeScript file \('\.ts' or '\.mts'\)/);
    });

    it('should add an entry point for every file matched by a pattern', async () => {
      await harness.writeFiles({
        'projects/lib/feature/src/public-api.ts': 'export const FEATURE = 1;\n',
        'projects/lib/nested/child/src/public-api.ts': 'export const CHILD = 2;\n',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        entryPoints: {
          '.': 'projects/lib/src/public-api.ts',
          './*': 'projects/lib/*/src/public-api.ts',
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const { exports } = JSON.parse(harness.readFile('dist/lib/package.json'));
      expect(Object.keys(exports).sort()).toEqual([
        '.',
        './feature',
        './nested/child',
        './package.json',
      ]);
      harness.expectFile('dist/lib/fesm2022/lib-feature.mjs').content.toContain('FEATURE');
      harness.expectFile('dist/lib/fesm2022/lib-nested-child.mjs').content.toContain('CHILD');
    });

    it('should prefer an explicit entry point over a pattern match for the same file', async () => {
      await harness.writeFiles({
        'projects/lib/feature/src/public-api.ts': 'export const FEATURE = 1;\n',
        'projects/lib/other/src/public-api.ts': 'export const OTHER = 2;\n',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        entryPoints: {
          '.': 'projects/lib/src/public-api.ts',
          './*': 'projects/lib/*/src/public-api.ts',
          './renamed': 'projects/lib/other/src/public-api.ts',
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const { exports } = JSON.parse(harness.readFile('dist/lib/package.json'));
      expect(Object.keys(exports).sort()).toEqual([
        '.',
        './feature',
        './package.json',
        './renamed',
      ]);
    });

    it('should fail when a pattern does not match any files', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        entryPoints: {
          '.': 'projects/lib/src/public-api.ts',
          './*': 'projects/lib/*/missing.ts',
        },
      });

      const { result, error } = await harness.executeOnce({
        outputLogsOnException: false,
        outputLogsOnFailure: false,
      });
      expect(result).toBeUndefined();
      expect((error as Error).message).toMatch(/did not match any files/);
    });

    it('should fail when only the key or the path contains a pattern', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        entryPoints: {
          '.': 'projects/lib/src/public-api.ts',
          './*': 'projects/lib/src/public-api.ts',
        },
      });

      const { result, error } = await harness.executeOnce({
        outputLogsOnException: false,
        outputLogsOnFailure: false,
      });
      expect(result).toBeUndefined();
      expect((error as Error).message).toMatch(/must each contain exactly one '\*'/);
    });
  });
});
