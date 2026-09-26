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
