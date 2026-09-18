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
  });
});
