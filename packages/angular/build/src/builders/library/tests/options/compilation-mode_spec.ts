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
  });
});
