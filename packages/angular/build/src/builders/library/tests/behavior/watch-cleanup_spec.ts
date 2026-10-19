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
  describe('Behavior: "Watch Mode Asset and Output Cleanup"', () => {
    it('should emit newly created assets, respect ignore patterns, and clean up deleted assets in watch mode', async () => {
      await harness.writeFiles({
        'projects/lib/assets-dir/keep.txt': 'keep',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: '**/*.txt',
            input: 'projects/lib/assets-dir',
            output: 'assets',
            ignore: ['**/ignored.txt'],
          },
        ],
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets/keep.txt')).toBe('keep');

          // Create an ignored file and a matching nested asset file
          await harness.writeFiles({
            'projects/lib/assets-dir/sub/ignored.txt': 'ignored',
            'projects/lib/assets-dir/sub/added.txt': 'added',
          });
        },
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets/sub/added.txt')).toBe('added');
          expect(harness.hasFile('dist/lib/assets/sub/ignored.txt')).toBeFalse();

          // Remove the added asset file
          await harness.removeFile('projects/lib/assets-dir/sub/added.txt');
        },
        ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets/keep.txt')).toBe('keep');
          expect(harness.hasFile('dist/lib/assets/sub/added.txt')).toBeFalse();
        },
      ]);
    });

    it('should clean up output files when a secondary entry point is removed in watch mode', async () => {
      await harness.writeFile(
        'projects/lib/secondary/src/public-api.ts',
        `export const secondary = 'secondary-value';`,
      );

      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
          './secondary': './secondary/src/public-api.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        declarationMap: true,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.hasFile('dist/lib/fesm2022/lib.mjs')).toBeTrue();
          expect(harness.hasFile('dist/lib/fesm2022/lib-secondary.mjs')).toBeTrue();
          expect(harness.hasFile('dist/lib/fesm2022/lib-secondary.mjs.map')).toBeTrue();
          expect(harness.hasFile('dist/lib/types/lib-secondary.d.ts')).toBeTrue();
          expect(harness.hasFile('dist/lib/types/lib-secondary.d.ts.map')).toBeTrue();
          expect(harness.hasFile('dist/lib/secondary/package.json')).toBeTrue();
          expect(harness.hasFile('dist/lib/.npmignore')).toBeTrue();

          // Remove the secondary entry point from package.json exports
          await harness.modifyFile('projects/lib/package.json', (content) => {
            const pkg = JSON.parse(content);
            pkg.exports = {
              '.': './src/public-api.ts',
            };

            return JSON.stringify(pkg, null, 2);
          });
        },
        ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.hasFile('dist/lib/fesm2022/lib.mjs')).toBeTrue();
          expect(harness.hasFile('dist/lib/fesm2022/lib-secondary.mjs')).toBeFalse();
          expect(harness.hasFile('dist/lib/fesm2022/lib-secondary.mjs.map')).toBeFalse();
          expect(harness.hasFile('dist/lib/types/lib-secondary.d.ts')).toBeFalse();
          expect(harness.hasFile('dist/lib/types/lib-secondary.d.ts.map')).toBeFalse();
          expect(harness.hasFile('dist/lib/secondary/package.json')).toBeFalse();
          expect(harness.hasFile('dist/lib/.npmignore')).toBeFalse();

          const pkg = JSON.parse(harness.readFile('dist/lib/package.json'));
          expect(pkg.exports['./secondary']).toBeUndefined();
        },
      ]);
    });

    it('should prune removed nested secondary entry point files and update .npmignore in watch mode', async () => {
      await harness.writeFiles({
        'projects/lib/shared/src/public-api.ts': `export const SHARED = 'shared';\n`,
        'projects/lib/testing/sub/src/public-api.ts': `export const SUB = 'sub';\n`,
      });

      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
          './shared': './shared/src/public-api.ts',
          './testing/sub': './testing/sub/src/public-api.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          harness.expectFile('dist/lib/fesm2022/lib-shared.mjs').toExist();
          harness.expectFile('dist/lib/fesm2022/lib-testing-sub.mjs').toExist();
          harness.expectFile('dist/lib/types/lib-testing-sub.d.ts').toExist();
          harness.expectFile('dist/lib/testing/sub/package.json').toExist();
          expect(harness.readFile('dist/lib/.npmignore')).toContain('/testing/sub/package.json');

          // Remove './testing/sub' while keeping './shared'
          await harness.modifyFile('projects/lib/package.json', (content) => {
            const pkg = JSON.parse(content);
            pkg.exports = {
              '.': './src/public-api.ts',
              './shared': './shared/src/public-api.ts',
            };

            return JSON.stringify(pkg, null, 2);
          });
        },
        ({ result }) => {
          expect(result?.success).toBeTrue();
          harness.expectFile('dist/lib/fesm2022/lib-shared.mjs').toExist();
          harness.expectFile('dist/lib/fesm2022/lib-testing-sub.mjs').toNotExist();
          harness.expectFile('dist/lib/fesm2022/lib-testing-sub.mjs.map').toNotExist();
          harness.expectFile('dist/lib/types/lib-testing-sub.d.ts').toNotExist();
          harness.expectFile('dist/lib/testing/sub/package.json').toNotExist();

          const npmignore = harness.readFile('dist/lib/.npmignore');
          expect(npmignore).toContain('/shared/package.json');
          expect(npmignore).not.toContain('/testing/sub/package.json');
        },
      ]);
    });

    it('should clean up all output destinations when a single asset source matches multiple patterns and is deleted in watch mode', async () => {
      await harness.writeFiles({
        'projects/lib/assets-dir/shared.txt': 'shared-content',
        'projects/lib/assets-dir/keep.txt': 'keep-content',
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [
          {
            glob: '**/*.txt',
            input: 'projects/lib/assets-dir',
            output: 'assets-a',
          },
          {
            glob: '**/*.txt',
            input: 'projects/lib/assets-dir',
            output: 'assets-b',
          },
        ],
        watch: true,
      });

      await harness.executeWithCases([
        async ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.readFile('dist/lib/assets-a/shared.txt')).toBe('shared-content');
          expect(harness.readFile('dist/lib/assets-b/shared.txt')).toBe('shared-content');

          await harness.removeFile('projects/lib/assets-dir/shared.txt');
        },
        ({ result }) => {
          expect(result?.success).toBeTrue();
          expect(harness.hasFile('dist/lib/assets-a/shared.txt')).toBeFalse();
          expect(harness.hasFile('dist/lib/assets-b/shared.txt')).toBeFalse();
          expect(harness.readFile('dist/lib/assets-a/keep.txt')).toBe('keep-content');
          expect(harness.readFile('dist/lib/assets-b/keep.txt')).toBe('keep-content');
        },
      ]);
    });
  });
});
