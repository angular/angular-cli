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
        'projects/lib/assets-dir/ignored.png': 'PNG_IGNORED',
        'projects/lib/assets-dir/file-c.svg': 'SVG_C',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: '**/*.png',
            input: 'projects/lib/assets-dir',
            output: 'assets',
            ignore: ['ignored.png'],
          },
        ],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expect(harness.readFile('dist/lib/assets/file-a.png')).toBe('PNG_A');
      expect(harness.readFile('dist/lib/assets/file-b.png')).toBe('PNG_B');
      expect(harness.hasFile('dist/lib/assets/ignored.png')).toBeFalse();
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

    it('should not copy root README.md into secondary entry point output when secondary entry point is in projectRoot', async () => {
      await harness.writeFiles({
        'projects/lib/README.md': '# Root Library README',
        'projects/lib/testing.ts': 'export const TESTING = true;',
      });

      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
          './testing': './testing.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expect(harness.readFile('dist/lib/README.md')).toBe('# Root Library README');
      expect(harness.hasFile('dist/lib/testing/README.md')).toBeFalse();
    });

    it('should not copy README.md into secondary entry point output when sharing directory with primary entry point', async () => {
      await harness.writeFiles({
        'projects/lib/README.md': '# Root Library README',
        'projects/lib/src/README.md': '# Src README',
        'projects/lib/src/testing.ts': 'export const TESTING = true;',
      });

      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
          './testing': './src/testing.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expect(harness.readFile('dist/lib/README.md')).toBe('# Root Library README');
      expect(harness.hasFile('dist/lib/testing/README.md')).toBeFalse();
    });

    it('should copy secondary entry point README.md when located in its own directory', async () => {
      await harness.writeFiles({
        'projects/lib/README.md': '# Root Library README',
        'projects/lib/testing/README.md': '# Testing Entry Point README',
        'projects/lib/testing/public-api.ts': 'export const TESTING = true;',
      });

      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
          './testing': './testing/public-api.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expect(harness.readFile('dist/lib/README.md')).toBe('# Root Library README');
      expect(harness.readFile('dist/lib/testing/README.md')).toBe('# Testing Entry Point README');
    });
  });
});
