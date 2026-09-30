/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeLibraryBuilder } from '../../builder';
import { LIBRARY_BUILDER_INFO, describeLibraryBuilder } from '../setup';

describeLibraryBuilder(executeLibraryBuilder, LIBRARY_BUILDER_INFO, (harness) => {
  describe('Package.json "exports" entry points', () => {
    it('should succeed when entry point is a .ts file', async () => {
      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should succeed when exports is a string shorthand', async () => {
      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = './src/public-api.ts';

        return JSON.stringify(pkg, null, 2);
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should succeed when entry point is a .mts file', async () => {
      await harness.writeFiles({
        'projects/lib/src/public-api.mts': 'export const VALUE = 42;\n',
      });
      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.mts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should succeed with a nested entry point beside a similarly named flat one', async () => {
      await harness.writeFiles({
        'projects/lib/zz/child/public-api.ts': 'export const NESTED = 42;\n',
        'projects/lib/zz-sibling/public-api.ts': 'export const FLAT = 7;\n',
      });
      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
          './zz/child': './zz/child/public-api.ts',
          './zz-sibling': './zz-sibling/public-api.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/lib/fesm2022/lib-zz-child.mjs').toExist();
      harness.expectFile('dist/lib/fesm2022/lib-zz-sibling.mjs').toExist();
    });

    it('should fail when two entry points produce the same bundle name', async () => {
      // A bundle name flattens '/' to '-', so './zz/child' and './zz-child' both
      // become 'lib-zz-child'. Without a guard the second silently overwrites the
      // first in the bundler input map: the build exits 0, one entry point's code
      // is gone, and both 'exports' keys resolve to the surviving file.
      await harness.writeFiles({
        'projects/lib/zz/child/public-api.ts': 'export const NESTED = 42;\n',
        'projects/lib/zz-child/public-api.ts': 'export const FLAT = 7;\n',
      });
      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
          './zz/child': './zz/child/public-api.ts',
          './zz-child': './zz-child/public-api.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      const { result, error } = await harness.executeOnce({
        outputLogsOnException: false,
        outputLogsOnFailure: false,
      });
      expect(result).toBeUndefined();
      expect(error).toBeDefined();
      expect((error as Error).message).toMatch(
        /both produce the bundle name 'lib-zz-child'/,
      );
    });

    it('should fail when two entry points differ only by case', async () => {
      // Distinct keys in the bundler input map, but one file on a case-insensitive
      // filesystem, so the emitted bundle depends on which OS ran the build.
      await harness.writeFiles({
        'projects/lib/Zz/public-api.ts': 'export const UPPER = 42;\n',
        'projects/lib/zz/public-api.ts': 'export const LOWER = 7;\n',
      });
      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
          './Zz': './Zz/public-api.ts',
          './zz': './zz/public-api.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      const { result, error } = await harness.executeOnce({
        outputLogsOnException: false,
        outputLogsOnFailure: false,
      });
      expect(result).toBeUndefined();
      expect(error).toBeDefined();
      expect((error as Error).message).toMatch(/both produce the bundle name/);
    });

    it('should fail when entry point is not a .ts or .mts file', async () => {
      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.cts',
        };

        return JSON.stringify(pkg, null, 2);
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
      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.d.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      const { result, error } = await harness.executeOnce({
        outputLogsOnException: false,
        outputLogsOnFailure: false,
      });
      expect(result).toBeUndefined();
      expect(error).toBeDefined();
      expect((error as Error).message).toMatch(/must be a TypeScript file \('\.ts' or '\.mts'\)/);
    });
  });
});
