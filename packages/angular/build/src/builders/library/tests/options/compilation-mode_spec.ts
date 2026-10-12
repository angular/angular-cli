/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeLibraryBuilder } from '../../builder';
import { CompilationMode } from '../../schema';
import { BASE_OPTIONS, LIBRARY_BUILDER_INFO, describeLibraryBuilder } from '../setup';

describeLibraryBuilder(executeLibraryBuilder, LIBRARY_BUILDER_INFO, (harness) => {
  describe('Option: "compilationMode"', () => {
    it('should emit partial declarations when compilationMode is "partial"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        compilationMode: CompilationMode.Partial,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const fesm = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesm).toContain('ɵɵngDeclareComponent');
    });

    it('should emit full definitions when compilationMode is "full"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        compilationMode: CompilationMode.Full,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const fesm = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesm).toContain('ɵɵdefineComponent');
    });

    it('should respect angularCompilerOptions.compilationMode from tsconfig when not set in builder options', async () => {
      await harness.modifyFile('projects/lib/tsconfig.lib.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.angularCompilerOptions = {
          ...tsconfig.angularCompilerOptions,
          compilationMode: 'full',
        };

        return JSON.stringify(tsconfig, null, 2);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const fesm = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesm).toContain('ɵɵdefineComponent');

      const pkgJson = JSON.parse(harness.readFile('dist/lib/package.json'));
      expect(pkgJson.scripts?.prepublishOnly).toContain('full compilation mode');
    });

    it('should override angularCompilerOptions.compilationMode from tsconfig when set in builder options', async () => {
      await harness.modifyFile('projects/lib/tsconfig.lib.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.angularCompilerOptions = {
          ...tsconfig.angularCompilerOptions,
          compilationMode: 'full',
        };

        return JSON.stringify(tsconfig, null, 2);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        compilationMode: CompilationMode.Partial,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const fesm = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesm).toContain('ɵɵngDeclareComponent');
    });
  });
});
