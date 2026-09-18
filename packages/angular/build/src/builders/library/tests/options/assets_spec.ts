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
  describe('Option: "assets"', () => {
    it('should copy assets matching glob patterns with input, output, and ignore', async () => {
      await harness.writeFiles({
        'projects/lib/assets-dir/file-a.png': 'PNG_A',
        'projects/lib/assets-dir/file-b.png': 'PNG_B',
        'projects/lib/assets-dir/file-c.svg': 'SVG_C',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: '**/*.png',
            input: 'projects/lib/assets-dir',
            output: 'assets',
          },
        ],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expect(harness.readFile('dist/lib/assets/file-a.png')).toBe('PNG_A');
      expect(harness.readFile('dist/lib/assets/file-b.png')).toBe('PNG_B');
      expect(harness.hasFile('dist/lib/assets/file-c.svg')).toBeFalse();
    });

    it('should support string-based asset paths', async () => {
      await harness.writeFile('projects/lib/docs/README.md', '# Library Docs');

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: ['projects/lib/docs/README.md'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expect(harness.readFile('dist/lib/docs/README.md')).toBe('# Library Docs');
    });
  });
});
