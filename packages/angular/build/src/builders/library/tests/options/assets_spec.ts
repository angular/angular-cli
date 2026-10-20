/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { rm, symlink } from 'node:fs/promises';
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

    it('should allow user assets to override default README.md without duplicate emission', async () => {
      await harness.writeFiles({
        'projects/lib/README.md': '# Default Library README',
        'projects/lib/docs/README.md': '# Custom Library README',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: 'README.md',
            input: 'projects/lib/docs',
            output: '.',
          },
        ],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(harness.readFile('dist/lib/README.md')).toBe('# Custom Library README');
    });

    it('should not emit symlinked assets in watch mode when followSymlinks is false', async () => {
      await harness.writeFiles({
        'projects/lib/assets-dir/real.txt': 'real-initial',
        'projects/lib/external.txt': 'external-content',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: '**/*.txt',
            input: 'projects/lib/assets-dir',
            output: 'assets',
            followSymlinks: false,
          },
        ],
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets/real.txt')).toBe('real-initial');

          await symlink(
            harness.resolvePath('projects/lib/external.txt'),
            harness.resolvePath('projects/lib/assets-dir/linked.txt'),
          );
          await harness.writeFile('projects/lib/assets-dir/real.txt', 'real-updated');
        },
        ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets/real.txt')).toBe('real-updated');
          expect(harness.hasFile('dist/lib/assets/linked.txt')).toBeFalse();
        },
      ]);
    });

    it('should respect directory ignore patterns in watch mode', async () => {
      await harness.writeFiles({
        'projects/lib/assets-dir/keep.txt': 'keep',
        'projects/lib/assets-dir/ignored-dir/initial.txt': 'ignored-initial',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: '**/*.txt',
            input: 'projects/lib/assets-dir',
            output: 'assets',
            ignore: ['ignored-dir'],
          },
        ],
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets/keep.txt')).toBe('keep');
          expect(harness.hasFile('dist/lib/assets/ignored-dir/initial.txt')).toBeFalse();

          await harness.writeFiles({
            'projects/lib/assets-dir/ignored-dir/added.txt': 'ignored-added',
            'projects/lib/assets-dir/allowed-dir/added.txt': 'allowed-added',
          });
        },
        ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets/allowed-dir/added.txt')).toBe('allowed-added');
          expect(harness.hasFile('dist/lib/assets/ignored-dir/added.txt')).toBeFalse();
        },
      ]);
    });

    it('should delete emitted assets when a subdirectory is deleted in watch mode', async () => {
      await harness.writeFiles({
        'projects/lib/assets-dir/keep.txt': 'keep',
        'projects/lib/assets-dir/nested/a.txt': 'nested-a',
        'projects/lib/assets-dir/nested/b.txt': 'nested-b',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: '**/*.txt',
            input: 'projects/lib/assets-dir',
            output: 'assets',
          },
        ],
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets/keep.txt')).toBe('keep');
          expect(harness.readFile('dist/lib/assets/nested/a.txt')).toBe('nested-a');
          expect(harness.readFile('dist/lib/assets/nested/b.txt')).toBe('nested-b');

          await rm(harness.resolvePath('projects/lib/assets-dir/nested'), {
            recursive: true,
            force: true,
          });
        },
        ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets/keep.txt')).toBe('keep');
          expect(harness.hasFile('dist/lib/assets/nested/a.txt')).toBeFalse();
          expect(harness.hasFile('dist/lib/assets/nested/b.txt')).toBeFalse();
        },
      ]);
    });
  });
});
